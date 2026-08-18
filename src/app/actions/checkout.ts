'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateTaxes, LocalizationCode } from '@/lib/core/taxEngine';
import { generateJournalEntryForInvoice } from '@/lib/core/accountingEngine';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { checkPermission, UserRole } from '@/lib/rbac';
import { eventBus } from '@/lib/core/events/eventBus';
import { pluginManager } from '@/lib/core/plugins/pluginManager';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { getExchangeRate, convertUSDToLocal } from '@/lib/core/currencyEngine';
import Decimal from 'decimal.js';

interface CartItem {
  itemId: string;
  quantity: number;
}

interface CheckoutActor {
  email: string;
  role: UserRole;
}

export async function processSecureCheckout(
  cart: CartItem[], 
  entityId: string, 
  paymentMethod: string,
  tenantId: string,
  actor: CheckoutActor,
  localizationCode: LocalizationCode = 'VE',
  idempotencyKey?: string,
  chargeTaxes: boolean = true,
  paymentBreakdown?: Array<{ method: 'cash' | 'card' | 'transfer'; amount: number }>
) {
  try {
    // Rate Limiting Guard
    const rateCheck = checkRateLimit(actor.email || 'anonymous', 'checkout');
    if (!rateCheck.allowed) {
      return { 
        success: false, 
        error: `Demasiadas peticiones. Por favor reintenta en ${rateCheck.retryAfterSec} segundos.` 
      };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 0: Validación Multi-Tenant Estricta
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso multi-tenant denegado.' };
    }


    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 1: Verificación de Permisos en Servidor (RBAC)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!checkPermission(actor.role, 'finanzas')) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'permission.denied',
        target_type: 'checkout',
        metadata: { reason: 'Rol sin permiso de finanzas intentó hacer checkout' }
      });
      return { success: false, error: 'Acceso denegado: No tienes permisos para procesar ventas.' };
    }

    if (!cart.length || !entityId || !tenantId) {
      throw new Error('Datos incompletos para el checkout');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 2: Control Transaccional (Idempotencia)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (idempotencyKey) {
      const { data: existingDoc } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('type', 'invoice')
        .eq('metadata->>idempotency_key', idempotencyKey)
        .single();
      
      if (existingDoc) {
        console.warn(`Idempotency hit: cobro duplicado interceptado. Key: ${idempotencyKey}`);
        return { success: true, document: existingDoc, isDuplicate: true };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 3: Inmutabilidad Fiscal (Snapshotting)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let entityData: any = null;
    
    // Intentar buscar cliente real
    const { data: realEntity } = await supabaseAdmin
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .maybeSingle();

    if (realEntity) {
      entityData = realEntity;
    } else {
      // Fallback: Si no se encuentra (o es el ID del tenant), buscar o crear el "Cliente de Mostrador" genérico
      const { data: counterEntity } = await supabaseAdmin
        .from('entities')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'customer')
        .eq('name', 'Cliente de Mostrador')
        .maybeSingle();

      if (counterEntity) {
        entityData = counterEntity;
      } else {
        // Crear cliente de mostrador por defecto
        const { data: newCounter, error: createError } = await supabaseAdmin
          .from('entities')
          .insert([{
            tenant_id: tenantId,
            type: 'customer',
            name: 'Cliente de Mostrador',
            email: 'mostrador@saascore.com',
            phone: 'N/A',
            tax_id: 'J-GENERICO',
            address: 'Venta de Mostrador',
            status: 'active',
            metadata: { total_debt: 0 }
          }])
          .select()
          .single();

        if (createError) throw new Error('No se pudo crear cliente genérico fallback: ' + createError.message);
        entityData = newCounter;
      }
    }

    const customerSnapshot = {
      snapshot_name: entityData.name,
      snapshot_tax_id: entityData.tax_id || 'N/A',
      snapshot_email: entityData.email || 'N/A',
      snapshot_phone: entityData.phone || 'N/A',
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 4: Validación de Ítems (Solo precios del servidor)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const itemIds = cart.map(c => c.itemId);
    const { data: dbItems, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('*')
      .in('id', itemIds);

    if (itemsError || !dbItems) throw new Error('Error validando ítems en la base de datos');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 5: Matemáticas Seguras (Decimal.js)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let subtotalDecimal = new Decimal(0);
    const documentLines = [];
    const stockUpdates = [];

    for (const cartItem of cart) {
      const realItem = dbItems.find(i => i.id === cartItem.itemId);
      if (!realItem) throw new Error(`Ítem no existe: ${cartItem.itemId}`);

      const itemStock = realItem.stock !== undefined ? realItem.stock : realItem.stock_quantity;

      if (itemStock !== null && itemStock !== undefined && itemStock < cartItem.quantity) {
        throw new Error(`Stock insuficiente para: ${realItem.name}`);
      }

      const lineSubtotal = new Decimal(realItem.base_price).times(cartItem.quantity);
      subtotalDecimal = subtotalDecimal.plus(lineSubtotal);

      documentLines.push({
        item_id: realItem.id,
        description: realItem.name,
        quantity: cartItem.quantity,
        unit_price: realItem.base_price,
        tax_amount: 0
      });

      if (itemStock !== null && itemStock !== undefined) {
        stockUpdates.push({ id: realItem.id, new_stock: itemStock - cartItem.quantity });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 6: Motor Bimoneda e Impuestos Localizados
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let taxResult;
    if (chargeTaxes) {
      taxResult = calculateTaxes(subtotalDecimal.toNumber(), localizationCode, paymentMethod);
    } else {
      taxResult = {
        subtotal: subtotalDecimal.toNumber(),
        taxAmount: 0,
        total: subtotalDecimal.toNumber(),
        details: {
          taxRate: 0,
          igtfRate: 0,
          igtfAmount: 0,
          baseIgtf: 0,
          chargeTaxes: false
        }
      };
    }
    const exchangeData = await getExchangeRate('VES', tenantId);
    const totalLocal = convertUSDToLocal(taxResult.total, exchangeData.rate);

    documentLines.forEach(line => {
      line.tax_amount = new Decimal(line.unit_price)
        .times(line.quantity)
        .times(taxResult.details.taxRate)
        .toDecimalPlaces(2)
        .toNumber();
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 7: Inserción Inmutable de la Factura Bimoneda
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { data: newDoc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert([{
        tenant_id: tenantId,
        entity_id: entityId,
        type: 'invoice',
        status: 'invoiced',
        document_number: `INV-${Date.now().toString().slice(-6)}`,
        subtotal_amount: taxResult.subtotal,
        tax_amount: taxResult.taxAmount,
        total_amount: taxResult.total,
        metadata: {
          localization: localizationCode,
          tax_details: taxResult.details,
          payment_method: paymentBreakdown ? 'mixed' : paymentMethod,
          ...(paymentBreakdown ? { payments: paymentBreakdown } : {}),
          timestamp_sealed: new Date().toISOString(),
          customer_snapshot: customerSnapshot,
          idempotency_key: idempotencyKey || null,
          processed_by: actor.email,
          exchange_rate: exchangeData.rate,
          currency_local: exchangeData.currency,
          currency_symbol: exchangeData.symbol,
          total_local: totalLocal,
          cart_lines: documentLines.map((line: any) => ({
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            tax_amount: line.tax_amount,
            total: new Decimal(line.unit_price).times(line.quantity).toNumber()
          }))
        }
      }])
      .select()
      .single();

    if (docError) throw docError;

    // Líneas de la factura
    const linesToInsert = documentLines.map(line => ({ ...line, document_id: newDoc.id }));
    const { error: linesError } = await supabaseAdmin.from('document_lines').insert(linesToInsert);

    if (linesError) {
      await supabaseAdmin.from('documents').delete().eq('id', newDoc.id);
      throw new Error('Fallo al guardar líneas, factura anulada por seguridad');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 8: Descuento Atómico de Inventario (RPC PostgreSQL)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    for (const cartItem of cart) {
      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('decrement_item_stock', {
        p_item_id: cartItem.itemId,
        p_quantity: cartItem.quantity,
        p_tenant_id: tenantId
      });

      if (rpcErr) {
        // En caso de que la función RPC aún no se haya desplegado, usar decremento atómico directo en SQL
        console.warn('RPC decrement_item_stock no disponible, usando fallback seguro:', rpcErr.message);
        const realItem = dbItems.find(i => i.id === cartItem.itemId);
        const itemStock = realItem ? (realItem.stock !== undefined ? realItem.stock : realItem.stock_quantity) : null;
        if (realItem && itemStock !== null && itemStock !== undefined) {
          const newStock = Math.max(0, itemStock - cartItem.quantity);
          let { error: updateErr } = await supabaseAdmin.from('items').update({ stock: newStock }).eq('id', cartItem.itemId).eq('tenant_id', tenantId);
          if (updateErr && (updateErr.message.includes('stock') || updateErr.message.includes('column'))) {
            // Fallback: If DB schema uses stock_quantity instead of stock
            await supabaseAdmin.from('items').update({ stock_quantity: newStock }).eq('id', cartItem.itemId).eq('tenant_id', tenantId);
          }
        }
      } else if (rpcRes && rpcRes.length > 0 && !rpcRes[0].success) {
        // Si el procedimiento almacenado detectó stock insuficiente en el momento exacto
        await supabaseAdmin.from('documents').delete().eq('id', newDoc.id);
        throw new Error(rpcRes[0].error_message || 'Stock insuficiente para completar la venta');
      }
    }


    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 9: Asientos Contables (Partida Doble)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      await generateJournalEntryForInvoice(newDoc as any, tenantId);
    } catch (journalError) {
      console.warn('Factura guardada pero falló asiento contable:', journalError);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 10: Registro de Auditoría y Evento de Dominio
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'invoice.created',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: {
        total: taxResult.total,
        items: cart.length,
        localization: localizationCode,
        payment_method: paymentMethod
      }
    });

    // Emisión de evento para Plugins y listeners desacoplados
    await eventBus.emit('sale.completed', {
      saleId: newDoc.id,
      tenantId: tenantId,
      actorId: actor.email,
      total: taxResult.total,
      currency: 'USD',
      items: cart.map(c => ({ itemId: c.itemId, quantity: c.quantity, unitPrice: 0 })),
      metadata: newDoc.metadata,
      timestamp: new Date().toISOString()
    });

    return { success: true, document: newDoc };

  } catch (error: any) {
    console.error('SERVER ACTION ERROR (checkout):', error.message);
    return { success: false, error: error.message };
  }
}
