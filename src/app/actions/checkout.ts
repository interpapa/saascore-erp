'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateTaxes, LocalizationCode } from '@/lib/core/taxEngine';
import { generateJournalEntryForInvoice } from '@/lib/core/accountingEngine';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { checkPermission, UserRole } from '@/lib/rbac';
import { eventBus } from '@/lib/core/events/eventBus';
import { pluginManager } from '@/lib/core/plugins/pluginManager';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { getExchangeRate, convertUSDToLocal } from '@/lib/core/currencyEngine';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';
import Decimal from 'decimal.js';

export interface CartItem {
  itemId: string;
  quantity: number;
  name?: string;
  price?: number;
  type?: 'product' | 'service';
  appointmentId?: string;
}

export type CheckoutActor = ActionActor;

export async function processSecureCheckout(
  cart: CartItem[], 
  entityId: string | null | undefined, 
  paymentMethod: string = 'cash_usd',
  tenantId: string,
  actor: ActionActor,
  localizationCode: LocalizationCode = 'VE',
  idempotencyKey?: string,
  chargeTaxes: boolean = false,
  paymentBreakdown?: Array<{ method: 'cash' | 'card' | 'transfer' | 'credit'; amount: number }>,
  appointmentId?: string
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

    // Validación Backend de Módulo Activo (Estilo Odoo 17)
    const moduleCheck = await assertModuleEnabled(tenantId, 'caja');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Caja POS está desactivado para esta empresa.' };
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

    if (!cart.length || !tenantId) {
      return { success: false, error: 'Datos insuficientes para procesar la transacción.' };
    }

    // Validación de estrés: Evitar cantidades negativas, NaN o extremadamente gigantes
    for (const item of cart) {
      if (!item.itemId || typeof item.quantity !== 'number' || isNaN(item.quantity) || item.quantity <= 0) {
        return { success: false, error: `Cantidad inválida para el producto ID: ${item.itemId || 'desconocido'}` };
      }
      if (item.quantity > 1000000) {
        return { success: false, error: 'La cantidad por ítem no puede superar 1,000,000 de unidades.' };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 2: Control Transaccional (Idempotencia)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const cleanIdempotencyKey = typeof idempotencyKey === 'string' ? idempotencyKey.trim() : null;
    if (cleanIdempotencyKey) {
      const { data: existingDoc } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'invoice')
        .eq('metadata->>idempotency_key', cleanIdempotencyKey)
        .maybeSingle();
      
      if (existingDoc) {
        console.warn(`Idempotency hit: cobro duplicado interceptado. Key: ${cleanIdempotencyKey}`);
        return { success: true, document: existingDoc, isDuplicate: true };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 3: Inmutabilidad Fiscal (Snapshotting)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let entityData: any = null;
    
    // Intentar buscar cliente real perteneciente a este tenant (Anti-IDOR)
    if (entityId && entityId !== 'generic_counter_customer' && entityId !== tenantId) {
      const { data: realEntity } = await supabaseAdmin
        .from('entities')
        .select('*')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (realEntity) {
        entityData = realEntity;
      }
    }

    if (!entityData) {
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
            email: 'mostrador@Rendo.com',
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
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 4: Validación de Ítems (Solo precios del servidor)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const aggregatedDemand = new Map<string, number>();
    for (const c of cart) {
      aggregatedDemand.set(c.itemId, (aggregatedDemand.get(c.itemId) || 0) + c.quantity);
    }

    const itemIds = Array.from(aggregatedDemand.keys());
    const realItemIds = itemIds.filter(id => isValidUUID(id) && !isTemporaryId(id));
    
    let dbItems: any[] = [];
    if (realItemIds.length > 0) {
      const { data, error: itemsError } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('id', realItemIds);

      if (itemsError) throw new Error('Error validando ítems en la base de datos: ' + itemsError.message);
      dbItems = data || [];
    }

    // Validación de stock sobre demanda consolidada (solo para productos físicos de inventario)
    for (const [itemId, totalDemand] of Array.from(aggregatedDemand.entries())) {
      const realItem = dbItems.find(i => i.id === itemId);
      if (realItem) {
        if (realItem.type === 'product') {
          const itemStock = realItem.stock !== undefined ? realItem.stock : realItem.stock_quantity;
          if (itemStock !== null && itemStock !== undefined && itemStock < totalDemand) {
            throw new Error(`Stock insuficiente para: ${realItem.name} (disponible: ${itemStock}, solicitado: ${totalDemand})`);
          }
        }
      } else {
        const cartItem = cart.find(c => c.itemId === itemId);
        if (!cartItem?.name && !isTemporaryId(itemId) && !itemId.startsWith('appt-') && !itemId.startsWith('custom-')) {
          throw new Error(`Ítem no existe: ${itemId}`);
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 5: Matemáticas Seguras (Decimal.js)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let subtotalDecimal = new Decimal(0);
    const documentLines = [];

    for (const cartItem of cart) {
      const realItem = dbItems.find(i => i.id === cartItem.itemId);
      const unitPrice = realItem ? Number(realItem.base_price) : (Number(cartItem.price) || 0);
      const itemName = realItem ? realItem.name : (cartItem.name || 'Servicio de Cita');

      const lineSubtotal = new Decimal(unitPrice).times(cartItem.quantity);
      subtotalDecimal = subtotalDecimal.plus(lineSubtotal);

      documentLines.push({
        item_id: realItem ? realItem.id : null,
        description: itemName,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
        tax_amount: 0
      });
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

    // Validación Matemática de Desglose de Pagos Combinados (Anti-Fraude)
    if (paymentBreakdown && paymentBreakdown.length > 0) {
      let breakdownSum = new Decimal(0);
      for (const p of paymentBreakdown) {
        if (p.amount < 0) {
          return { success: false, error: 'Los importes en el desglose de pago no pueden ser negativos.' };
        }
        breakdownSum = breakdownSum.plus(new Decimal(p.amount));
      }
      if (breakdownSum.minus(taxResult.total).abs().greaterThan(0.02)) {
        return { 
          success: false, 
          error: `El desglose de pagos ($${breakdownSum.toFixed(2)}) no coincide con el total de la orden ($${taxResult.total.toFixed(2)}).` 
        };
      }
    }

    // Validación de Venta a Crédito: Requiere cliente real en CRM
    const isCreditPayment = paymentMethod === 'credit';
    const creditInBreakdown = paymentBreakdown?.filter(p => p.method === ('credit' as any)) || [];
    const totalCreditAmount = isCreditPayment 
      ? taxResult.total 
      : creditInBreakdown.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    if (totalCreditAmount > 0) {
      const isGenericCounter = !entityData || entityData.name === 'Cliente de Mostrador' || entityData.tax_id === 'J-GENERICO' || entityId === tenantId;
      if (isGenericCounter) {
        return { 
          success: false, 
          error: 'La venta a crédito requiere seleccionar un cliente registrado en el CRM para asociar la cuenta por cobrar.' 
        };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 7: Inserción Inmutable de la Factura / Orden de Entrega Bimoneda
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const docSubtype = chargeTaxes ? 'fiscal_invoice' : 'delivery_order';
    const docPrefix = chargeTaxes ? 'FAC' : 'ORD';
    const docLabel = chargeTaxes ? 'Factura Fiscal' : 'Orden de Entrega';

    const safeEntityId = (entityData && isValidUUID(entityData.id) && !isTemporaryId(entityData.id)) 
      ? entityData.id 
      : ((entityId && isValidUUID(entityId) && !isTemporaryId(entityId) && entityId !== tenantId) ? entityId : null);

    const { data: newDoc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert([{
        tenant_id: tenantId,
        entity_id: safeEntityId,
        type: 'invoice',
        status: 'invoiced',
        document_number: `${docPrefix}-${Date.now().toString().slice(-6)}`,
        subtotal_amount: taxResult.subtotal,
        tax_amount: taxResult.taxAmount,
        total_amount: taxResult.total,
        metadata: {
          doc_subtype: docSubtype,
          doc_label: docLabel,
          charge_taxes: chargeTaxes,
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

    // Si la venta tiene monto a crédito, actualizar automáticamente la deuda del cliente en el CRM
    if (totalCreditAmount > 0 && entityData?.id && isValidUUID(entityData.id) && !isTemporaryId(entityData.id)) {
      try {
        const currentDebt = Number(entityData.metadata?.total_debt || 0);
        const updatedDebt = currentDebt + totalCreditAmount;
        await supabaseAdmin
          .from('entities')
          .update({
            metadata: {
              ...(entityData.metadata || {}),
              total_debt: updatedDebt
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', entityData.id)
          .eq('tenant_id', tenantId);

        entityData.metadata = { ...(entityData.metadata || {}), total_debt: updatedDebt };
      } catch (debtErr) {
        console.warn('[checkout.ts] Advertencia al actualizar deuda de cliente:', debtErr);
      }
    }

    // Si la venta está vinculada a una cita de la agenda, marcarla automáticamente como pagada
    if (appointmentId) {
      try {
        const { data: currentAppt } = await supabaseAdmin
          .from('appointments')
          .select('metadata')
          .eq('id', appointmentId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        const mergedApptMeta = {
          ...(typeof currentAppt?.metadata === 'object' && currentAppt?.metadata !== null ? currentAppt.metadata : {}),
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          invoice_id: newDoc.id,
          invoice_number: newDoc.document_number,
          paid_via_pos: true,
        };

        await supabaseAdmin
          .from('appointments')
          .update({
            status: 'completed',
            metadata: mergedApptMeta,
          })
          .eq('id', appointmentId)
          .eq('tenant_id', tenantId);
      } catch (apptErr) {
        console.warn('[checkout.ts] Aviso: No se pudo actualizar metadata de cita:', apptErr);
      }
    }

    // Líneas de la factura
    const linesToInsert = documentLines.map(line => ({ ...line, document_id: newDoc.id }));
    const { error: linesError } = await supabaseAdmin.from('document_lines').insert(linesToInsert);

    if (linesError) {
      const isMissingTable = 
        linesError.code === 'PGRST205' || 
        linesError.message?.includes('could not find the table') || 
        linesError.message?.includes('schema cache');

      if (!isMissingTable) {
        await supabaseAdmin.from('documents').delete().eq('id', newDoc.id);
        throw new Error('Fallo al guardar líneas, factura anulada por seguridad: ' + linesError.message);
      } else {
        console.warn('Nota: Tabla document_lines no disponible; líneas guardadas en documents.metadata.cart_lines');
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 8: Descuento Atómico de Inventario (Saga Pattern / Rollback Seguro)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const successfulDecrements: Array<{ itemId: string; quantity: number }> = [];
    
    for (const [itemId, quantity] of Array.from(aggregatedDemand.entries())) {
      const realItem = dbItems.find(i => i.id === itemId);
      // Los servicios y los ítems de citas NO descuentan inventario físico
      if (!realItem || realItem.type === 'service') {
        continue;
      }

      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('decrement_item_stock', {
        p_item_id: itemId,
        p_quantity: quantity,
        p_tenant_id: tenantId
      });

      let itemFailed = false;
      let failReason = '';

      if (rpcErr) {
        console.warn('RPC decrement_item_stock no disponible, usando fallback:', rpcErr.message);
        const realItem = dbItems.find(i => i.id === itemId);
        const itemStock = realItem ? (realItem.stock !== undefined ? realItem.stock : realItem.stock_quantity) : null;
        if (realItem && itemStock !== null && itemStock !== undefined) {
          if (itemStock < quantity) {
             itemFailed = true;
             failReason = `Stock insuficiente para: ${realItem.name}`;
          } else {
             const newStock = Math.max(0, itemStock - quantity);
             const { error: updateErr } = await supabaseAdmin.from('items').update({ stock: newStock }).eq('id', itemId).eq('tenant_id', tenantId);
             if (updateErr && (updateErr.message.includes('stock') || updateErr.message.includes('column'))) {
               await supabaseAdmin.from('items').update({ stock_quantity: newStock }).eq('id', itemId).eq('tenant_id', tenantId);
             }
          }
        }
      } else if (rpcRes && rpcRes.length > 0 && !rpcRes[0].success) {
        itemFailed = true;
        failReason = rpcRes[0].error_message || 'Stock insuficiente';
      }

      if (itemFailed) {
        // [ROLLBACK INVENTARIO]: Revertir todos los descuentos anteriores exitosos
        for (const success of successfulDecrements) {
          const oldItem = dbItems.find(i => i.id === success.itemId);
          if (oldItem) {
            const field = oldItem.stock !== undefined ? 'stock' : 'stock_quantity';
            const { data: currentData } = await supabaseAdmin.from('items').select(field).eq('id', success.itemId).single();
            if (currentData) {
               const rawData = currentData as Record<string, any>;
               const val = rawData.stock !== undefined ? rawData.stock : rawData.stock_quantity;
               const revertPayload = oldItem.stock !== undefined ? { stock: val + success.quantity } : { stock_quantity: val + success.quantity };
               await supabaseAdmin.from('items').update(revertPayload).eq('id', success.itemId).eq('tenant_id', tenantId);
            }
          }
        }
        // Destruir la factura huérfana
        await supabaseAdmin.from('documents').delete().eq('id', newDoc.id);
        throw new Error(`Venta cancelada (Inventario Revertido): ${failReason}`);
      } else {
        // Anotar éxito para posible rollback futuro
        successfulDecrements.push({ itemId, quantity });
      }
    }


    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 9: Asientos Contables (Partida Doble - Solo si Contabilidad está activa)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const contabilidadCheck = await assertModuleEnabled(tenantId, 'contabilidad');
    if (contabilidadCheck.authorized) {
      try {
        await generateJournalEntryForInvoice(newDoc as any, tenantId);
      } catch (journalError) {
        console.warn('Factura guardada pero falló asiento contable:', journalError);
      }
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

    newDoc.customer = entityData;
    newDoc.lines = linesToInsert;

    return { success: true, document: newDoc };

  } catch (error: any) {
    console.error('SERVER ACTION ERROR (checkout):', error.message);
    return { success: false, error: error.message };
  }
}
