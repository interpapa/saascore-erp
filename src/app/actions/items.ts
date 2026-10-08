'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkPermission, UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { createModuleAction } from '@/lib/core/kernel/actionKernel';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when called outside Next.js request lifecycle (e.g. testing / cron)
  }
}

export type ItemType = 'product' | 'service' | 'subscription';

export interface CreateItemActionInput {
  type: ItemType;
  sku?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  base_price: number;
  cost: number;
  stock_quantity?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export async function createItemAction(
  input: CreateItemActionInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      const invCheck = await assertModuleEnabled(tenantId, 'inventario');
      const dentalCheck = await assertModuleEnabled(tenantId, 'odontologia');
      if (!invCheck.authorized && !dentalCheck.authorized) {
        return { success: false, error: moduleCheck.error || 'El módulo de Catálogo/Inventario está desactivado.' };
      }
    }

    if (!tenantId) {
      return { success: false, error: 'La empresa activa es requerida para registrar el ítem.' };
    }
    if (!input.name || !input.name.trim()) {
      return { success: false, error: 'El nombre del artículo o servicio es requerido.' };
    }

    // Validación financiera: precios y costos no pueden ser negativos
    if (input.base_price < 0 || input.cost < 0) {
      return { success: false, error: 'El precio base y el costo no pueden ser importes negativos.' };
    }

    // Validación preventiva de productos duplicados con el mismo nombre exacto
    const cleanName = input.name.trim();
    const { data: existingDuplicate } = await supabaseAdmin
      .from('items')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .ilike('name', cleanName)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingDuplicate) {
      return { 
        success: false, 
        error: `Ya existe un producto o servicio registrado con el nombre "${cleanName}". Usa un nombre distintivo o edita el existente.` 
      };
    }

    const insertData: any = {
      tenant_id: tenantId,
      type: input.type,
      sku: input.sku || null,
      name: input.name,
      description: input.description || null,
      category: input.category || null,
      base_price: input.base_price,
      cost: input.cost,
      stock: input.type === 'product' ? (input.stock_quantity ?? 0) : null,
      is_active: input.is_active ?? true,
      metadata: input.metadata || {},
    };

    let { data: newItem, error } = await supabaseAdmin
      .from('items')
      .insert([insertData])
      .select()
      .single();

    if (error && (error.message.includes('stock') || error.message.includes('column'))) {
      // Fallback: If DB schema uses stock_quantity instead of stock (migration_run)
      delete insertData.stock;
      insertData.stock_quantity = input.type === 'product' ? (input.stock_quantity ?? 0) : null;
      const retry = await supabaseAdmin
        .from('items')
        .insert([insertData])
        .select()
        .single();
      newItem = retry.data;
      error = retry.error;
    }

    if (error) throw new Error('Error al guardar el ítem: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.updated',
      target_type: 'item',
      target_id: newItem.id,
      metadata: { action: 'created', name: input.name, price: input.base_price },
    });

    const mappedItem = newItem ? {
      ...newItem,
      stock: newItem.stock !== undefined ? newItem.stock : newItem.stock_quantity,
      stock_quantity: newItem.stock_quantity !== undefined ? newItem.stock_quantity : (newItem.stock ?? 0),
    } : null;

    return { success: true, item: mappedItem };
  } catch (err: any) {
    const errorMsg = err?.message || 'Error de red al conectar con el servidor (Failed to fetch).';
    console.error('[createItemAction Error]:', errorMsg);
    return { success: false, error: errorMsg };
  }
}


export async function updateItemAction(
  id: string,
  updates: Partial<CreateItemActionInput>,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!id) throw new Error('ID requerido.');

    // Blindaje defensivo contra IDs temporales en memoria
    if (!isValidUUID(id) || isTemporaryId(id)) {
      return { success: true, localOnly: true, item: { id, ...updates } };
    }

    // Buscar ítem para identificar su tenant_id real si hay discrepancia de contexto
    const { data: existingItem } = await supabaseAdmin
      .from('items')
      .select('id, tenant_id')
      .eq('id', id)
      .maybeSingle();

    const targetTenantId = existingItem?.tenant_id || tenantId;
    if (!targetTenantId) throw new Error('Empresa requerida.');

    const securityCheck = await validateUserTenantAccess(actor, targetTenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(targetTenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      const invCheck = await assertModuleEnabled(targetTenantId, 'inventario');
      const dentalCheck = await assertModuleEnabled(targetTenantId, 'odontologia');
      if (!invCheck.authorized && !dentalCheck.authorized) {
        return { success: false, error: moduleCheck.error || 'El módulo de Catálogo/Inventario está desactivado.' };
      }
    }

    if (
      (updates.base_price !== undefined && updates.base_price < 0) ||
      (updates.cost !== undefined && updates.cost < 0)
    ) {
      return { success: false, error: 'El precio base y el costo no pueden ser importes negativos.' };
    }

    // Si se modifica el nombre, verificar que no colisione con otro ítem existente
    if (updates.name && updates.name.trim()) {
      const cleanName = updates.name.trim();
      const { data: duplicate } = await supabaseAdmin
        .from('items')
        .select('id, name')
        .eq('tenant_id', targetTenantId)
        .ilike('name', cleanName)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (duplicate) {
        return { 
          success: false, 
          error: `Ya existe otro producto o servicio registrado con el nombre "${cleanName}".` 
        };
      }
    }

    const updatePayload: any = { ...updates };
    if (updatePayload.stock_quantity !== undefined) {
      updatePayload.stock = updatePayload.stock_quantity;
      delete updatePayload.stock_quantity;
    }

    let { data: updatedItem, error } = await supabaseAdmin
      .from('items')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', targetTenantId)
      .select()
      .single();

    if (error && (error.message.includes('stock') || error.message.includes('column'))) {
      // Fallback: Si el esquema de BD usa stock_quantity en vez de stock
      delete updatePayload.stock;
      if (updates.stock_quantity !== undefined) {
        updatePayload.stock_quantity = updates.stock_quantity;
      }
      const retry = await supabaseAdmin
        .from('items')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', targetTenantId)
        .select()
        .single();
      updatedItem = retry.data;
      error = retry.error;
    }

    if (error) throw new Error('Error al actualizar ítem: ' + error.message);

    await writeAuditLog({
      tenant_id: targetTenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.updated',
      target_type: 'item',
      target_id: id,
      metadata: { action: 'updated', updates },
    });

    const mappedItem = updatedItem ? {
      ...updatedItem,
      stock: updatedItem.stock !== undefined ? updatedItem.stock : updatedItem.stock_quantity,
      stock_quantity: updatedItem.stock_quantity !== undefined ? updatedItem.stock_quantity : (updatedItem.stock ?? 0),
    } : null;

    return { success: true, item: mappedItem };
  } catch (err: any) {
    console.error('[updateItemAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteItemAction(
  id: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!id) throw new Error('ID requerido.');

    // Blindaje defensivo contra IDs temporales: descartar localmente sin error 22P02
    if (!isValidUUID(id) || isTemporaryId(id)) {
      return { success: true, localOnly: true };
    }

    const { data: existingItem } = await supabaseAdmin
      .from('items')
      .select('id, tenant_id')
      .eq('id', id)
      .maybeSingle();

    const targetTenantId = existingItem?.tenant_id || tenantId;
    if (!targetTenantId) throw new Error('Empresa requerida.');

    const securityCheck = await validateUserTenantAccess(actor, targetTenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(targetTenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      const invCheck = await assertModuleEnabled(targetTenantId, 'inventario');
      const dentalCheck = await assertModuleEnabled(targetTenantId, 'odontologia');
      if (!invCheck.authorized && !dentalCheck.authorized) {
        return { success: false, error: moduleCheck.error || 'El módulo de Catálogo/Inventario está desactivado.' };
      }
    }

    // Soft delete: preservar historial e integridad contable/fiscal
    let { error } = await supabaseAdmin
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', targetTenantId);

    if (error && (error.message.includes('deleted_at') || error.message.includes('column'))) {
      // Fallback: Si no existe la columna deleted_at, lo marcamos como inactivo (is_active: false)
      const retry = await supabaseAdmin
        .from('items')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', targetTenantId);
      error = retry.error;
    }

    if (error) throw new Error('Error al eliminar ítem: ' + error.message);

    await writeAuditLog({
      tenant_id: targetTenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.deleted',
      target_type: 'item',
      target_id: id,
      metadata: { action: 'soft_deleted' },
    });

    return { success: true };
  } catch (err: any) {
    console.error('[deleteItemAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function getItemsAction(tenantId: string, type: ItemType | undefined, limit: number = 50, actor: ActionActor) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', items: [] };
    }

    if (!tenantId) return { success: true, items: [] };

    let selectFields = 'id, tenant_id, type, sku, name, description, category, base_price, cost, stock, is_active, metadata, created_at';
    let baseQuery = supabaseAdmin
      .from('items')
      .select(selectFields)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    if (type) {
      baseQuery = baseQuery.eq('type', type);
    }

    let { data: items, error } = await baseQuery;

    if (error && (error.message.includes('stock') || error.message.includes('deleted_at') || error.message.includes('column'))) {
      // Fallback: Query using stock_quantity and ignoring deleted_at column if missing (migration_run schema)
      selectFields = 'id, tenant_id, type, sku, name, description, category, base_price, cost, stock_quantity, is_active, metadata, created_at';
      let retryQuery = supabaseAdmin
        .from('items')
        .select(selectFields)
        .eq('tenant_id', tenantId)
        .neq('is_active', false) // Excluir los marcados como inactivos (soft delete alternativo)
        .order('created_at', { ascending: false })
        .range(0, limit - 1);
      
      if (type) {
        retryQuery = retryQuery.eq('type', type);
      }
      const retry = await retryQuery;
      items = retry.data;
      error = retry.error;
    }

    if (error) throw new Error(error.message);

    // Map `stock` or `stock_quantity` safely to `stock_quantity` for interface compatibility
    const mappedItems = (items || []).map((item: any) => ({
      ...item,
      stock: item.stock !== undefined ? item.stock : item.stock_quantity,
      stock_quantity: item.stock_quantity !== undefined ? item.stock_quantity : (item.stock ?? 0),
    }));

    return { success: true, items: mappedItems };
  } catch (err: any) {
    console.error('[getItemsAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, items: [] };
  }
}

export interface AdjustItemExpenseInput {
  recordExpense?: boolean;
  unitCost?: number;
  totalCost?: number;
  paymentSource?: 'cash' | 'payable' | 'other';
  supplierName?: string;
}

/**
 * Ajuste rápido de inventario (sumar/restar stock) con opción de asentar gasto de compra.
 * Ideal para compras rápidas de mostrador, reposición con costo o mermas.
 */
export async function adjustItemStockAction(
  id: string,
  quantityDelta: number,
  tenantId: string,
  actor: ActionActor,
  reason?: string,
  expenseData?: AdjustItemExpenseInput
) {
  try {
    if (!isValidUUID(id) || isTemporaryId(id)) {
      return { success: false, error: 'No se puede ajustar el stock de un ítem temporal o no sincronizado.' };
    }

    // 1. Obtener item actual por id sin asumir columnas específicas para evitar error 42703
    let { data: item, error: findError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) {
      console.error('[adjustItemStockAction] Error buscando item:', findError);
      return { success: false, error: 'Error al buscar el ítem: ' + findError.message };
    }

    if (!item) {
      return { success: false, error: 'Ítem no encontrado para ajustar.' };
    }

    const targetTenantId = item.tenant_id || tenantId;

    const securityCheck = await validateUserTenantAccess(actor, targetTenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado a la empresa del ítem.' };
    }

    const currentStock = Number(item.stock ?? item.stock_quantity ?? item.quantity ?? 0);
    const newStock = Math.max(0, currentStock + quantityDelta);

    // 2. Actualizar stock con fallback resiliente entre columnas
    let updateResult = await supabaseAdmin
      .from('items')
      .update({ stock: newStock })
      .eq('id', id)
      .eq('tenant_id', targetTenantId);

    let error = updateResult.error;

    if (error && (error.message.includes('stock') || error.message.includes('column'))) {
      const retryQty = await supabaseAdmin
        .from('items')
        .update({ stock_quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', targetTenantId);
      error = retryQty.error;
    }

    if (error && (error.message.includes('quantity') || error.message.includes('column'))) {
      const retryQuantity = await supabaseAdmin
        .from('items')
        .update({ quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', targetTenantId);
      error = retryQuantity.error;
    }

    if (error) throw new Error('Error al actualizar inventario: ' + error.message);

    // 3. Si es una entrada (+) y se solicitó registrar el gasto de compra
    let purchaseDocId: string | undefined = undefined;
    if (quantityDelta > 0 && expenseData?.recordExpense) {
      const safeTotalCost = Number(expenseData.totalCost) || (Number(expenseData.unitCost || 0) * quantityDelta);
      const safeUnitCost = Number(expenseData.unitCost) || (quantityDelta > 0 ? safeTotalCost / quantityDelta : 0);

      if (safeTotalCost > 0) {
        // Actualizar el costo del ítem si se suministró un costo unitario válido
        if (safeUnitCost > 0) {
          try {
            await supabaseAdmin
              .from('items')
              .update({ cost: safeUnitCost })
              .eq('id', id)
              .eq('tenant_id', targetTenantId);
          } catch (costErr) {
            console.warn('[adjustItemStockAction] Advertencia actualizando costo del ítem:', costErr);
          }
        }

        // Crear documento contable de compra / egreso
        const docNumber = `COM-${Date.now().toString().slice(-6)}`;
        try {
          const { data: purchaseDoc } = await supabaseAdmin
            .from('documents')
            .insert([{
              tenant_id: targetTenantId,
              entity_id: null,
              type: 'purchase_order',
              status: expenseData.paymentSource === 'payable' ? 'approved' : 'paid',
              document_number: docNumber,
              subtotal_amount: safeTotalCost,
              tax_amount: 0,
              total_amount: safeTotalCost,
              notes: `Reposición de mercancía: +${quantityDelta} uds de ${item.name}${reason ? ' (' + reason + ')' : ''}`,
              metadata: {
                category: 'reposicion_inventario',
                item_id: item.id,
                item_name: item.name,
                quantity: quantityDelta,
                unit_cost: safeUnitCost,
                total_cost: safeTotalCost,
                payment_source: expenseData.paymentSource || 'cash',
                supplier_name: expenseData.supplierName || 'Proveedor General',
                registered_by: actor.email,
                created_at: new Date().toISOString()
              }
            }])
            .select('id')
            .maybeSingle();

          if (purchaseDoc?.id) {
            purchaseDocId = purchaseDoc.id;
          }
        } catch (docErr) {
          console.warn('[adjustItemStockAction] Advertencia creando documento de compra:', docErr);
        }

        // Si se pagó desde caja chica / gaveta POS en efectivo, registrar la salida en la sesión abierta
        if (expenseData.paymentSource === 'cash' || !expenseData.paymentSource) {
          try {
            const { data: tenantData } = await supabaseAdmin
              .from('tenants')
              .select('metadata')
              .eq('id', targetTenantId)
              .maybeSingle();

            if (tenantData) {
              const sessions = tenantData.metadata?.cash_sessions || [];
              const openIndex = sessions.findIndex((s: any) => s.status === 'open');
              if (openIndex !== -1) {
                const openSession = sessions[openIndex];
                const rate = Number(openSession.exchangeRate) || Number(tenantData.metadata?.exchange_rate?.rate) || 849.56;
                const movAmountVES = safeTotalCost * rate;
                const movement: any = {
                  id: `MOV-${Date.now()}`,
                  type: 'out',
                  amount_usd: safeTotalCost,
                  amount_ves: movAmountVES,
                  reason: `Compra/Reposición: ${item.name} (+${quantityDelta} uds)`,
                  document_id: purchaseDocId,
                  created_at: new Date().toISOString(),
                  actor_email: actor.email,
                };
                const movements = openSession.cash_movements || [];
                movements.push(movement);
                openSession.cash_movements = movements;
                sessions[openIndex] = openSession;

                await supabaseAdmin
                  .from('tenants')
                  .update({
                    metadata: {
                      ...tenantData.metadata,
                      cash_sessions: sessions,
                    }
                  })
                  .eq('id', targetTenantId);
              }
            }
          } catch (cashErr) {
            console.warn('[adjustItemStockAction] Advertencia al asentar movimiento en caja chica:', cashErr);
          }
        }
      }
    }

    await writeAuditLog({
      tenant_id: targetTenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.updated',
      target_type: 'item',
      target_id: id,
      metadata: { 
        action: 'stock_adjustment', 
        delta: quantityDelta, 
        newStock, 
        previousStock: currentStock,
        reason: reason || 'Ajuste manual de inventario',
        purchase_doc_id: purchaseDocId
      },
    });

    safeRevalidate('/inventario');
    safeRevalidate('/catalogo');
    safeRevalidate('/caja');
    safeRevalidate('/compras');

    const mappedItem = {
      ...item,
      cost: (expenseData?.recordExpense && expenseData.unitCost) ? expenseData.unitCost : item.cost,
      stock: newStock,
      stock_quantity: newStock,
    };

    return { success: true, newStock, item: mappedItem, purchaseDocId };
  } catch (err: any) {
    console.error('[adjustItemStockAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Función construida con el Action Kernel:
 * Archiva o reactiva un producto/servicio con validación Zod, guardia de módulo 'catalogo',
 * Zero-Trust y auditoría automática sin escribir plomería manual.
 */
export const archiveItemAction = createModuleAction({
  module: 'catalogo',
  permission: 'inventario',
  schema: z.object({
    itemId: z.string(),
    archive: z.boolean().default(true),
  }),
  audit: {
    action: 'item.updated',
    targetType: 'item',
    getTargetId: (_res, input) => input.itemId,
  },
  revalidatePaths: ['/inventario', '/catalogo', '/caja'],
  handler: async ({ input, ctx }) => {
    const { data, error } = await ctx.supabase
      .from('items')
      .update({ is_active: !input.archive })
      .eq('id', input.itemId)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al modificar estado de archivo del producto: ' + error.message);
    return data;
  },
});

