'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkPermission, UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';

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

    if (!tenantId || !input.name) {
      throw new Error('Empresa y Nombre de ítem son requeridos.');
    }

    let insertData: any = {
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

    revalidatePath('/catalogo');
    revalidatePath('/caja');

    return { success: true, item: newItem };
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
    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    const { data: updatedItem, error } = await supabaseAdmin
      .from('items')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al actualizar ítem: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.updated',
      target_type: 'item',
      target_id: id,
      metadata: { action: 'updated', updates },
    });

    revalidatePath('/catalogo');
    revalidatePath('/caja');

    return { success: true, item: updatedItem };
  } catch (err: any) {
    console.error('[updateItemAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteItemAction(
  id: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // Soft delete: preservar historial e integridad contable/fiscal
    let { error } = await supabaseAdmin
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error && (error.message.includes('deleted_at') || error.message.includes('column'))) {
      // Fallback: Hard delete if soft-delete column does not exist
      const retry = await supabaseAdmin
        .from('items')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      error = retry.error;
    }

    if (error) throw new Error('Error al eliminar ítem: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.deleted',
      target_type: 'item',
      target_id: id,
      metadata: { action: 'soft_deleted' },
    });

    revalidatePath('/catalogo');
    revalidatePath('/caja');

    return { success: true };
  } catch (err: any) {
    console.error('[deleteItemAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getItemsAction(tenantId: string, type?: ItemType, limit: number = 50) {
  try {
    if (!tenantId) return { success: true, items: [] };

    let selectFields = 'id, type, sku, name, description, category, base_price, cost, stock, is_active, metadata, created_at';
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
      selectFields = 'id, type, sku, name, description, category, base_price, cost, stock_quantity, is_active, metadata, created_at';
      let retryQuery = supabaseAdmin
        .from('items')
        .select(selectFields)
        .eq('tenant_id', tenantId)
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
    console.error('[getItemsAction Error]:', err.message);
    return { success: false, error: err.message, items: [] };
  }
}

/**
 * Ajuste rápido de inventario (sumar/restar stock) sin pasar por POs.
 * Ideal para compras rápidas de mostrador sin proveedor formal o mermas.
 */
export async function adjustItemStockAction(
  id: string,
  quantityDelta: number,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // 1. Obtener item actual
    const { data: item, error: findError } = await supabaseAdmin
      .from('items')
      .select('stock, stock_quantity')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (findError || !item) throw new Error('Ítem no encontrado para ajustar.');

    const currentStock = item.stock !== undefined ? (item.stock || 0) : (item.stock_quantity || 0);
    const newStock = Math.max(0, currentStock + quantityDelta);

    // 2. Actualizar stock
        // 2. Actualizar stock con fallback y registrar cuál columna se usó
    let stockFieldUsed = 'stock';
    let { error } = await supabaseAdmin
      .from('items')
      .update({ stock: newStock })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error && (error.message.includes('stock') || error.message.includes('column'))) {
      // Intentar con stock_quantity
      const retryQty = await supabaseAdmin
        .from('items')
        .update({ stock_quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      error = retryQty.error;
      if (!error) stockFieldUsed = 'stock_quantity';
    }

    if (error && (error.message.includes('quantity') || error.message.includes('column'))) {
      // Intentar con columna genérica quantity
      const retryQuantity = await supabaseAdmin
        .from('items')
        .update({ quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      error = retryQuantity.error;
      if (!error) stockFieldUsed = 'quantity';
    }

    if (error) throw new Error('Error al actualizar inventario: ' + error.message);


    if (error && (error.message.includes('stock') || error.message.includes('column'))) {
      const retry = await supabaseAdmin
        .from('items')
        .update({ stock_quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      error = retry.error;
    }

    if (error) throw new Error('Error al actualizar inventario: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.updated',
      target_type: 'item',
      target_id: id,
      metadata: { action: 'stock_adjustment', delta: quantityDelta, newStock },
    });

    revalidatePath('/catalogo');
    revalidatePath('/caja');

    return { success: true, newStock };
  } catch (err: any) {
    console.error('[adjustItemStockAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

