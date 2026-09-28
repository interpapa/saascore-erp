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
      return { success: false, error: moduleCheck.error || 'El módulo de Catálogo está desactivado.' };
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

    safeRevalidate('/inventario');
    safeRevalidate('/catalogo');
    safeRevalidate('/caja');

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
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Catálogo está desactivado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // Blindaje defensivo contra IDs temporales en memoria
    if (!isValidUUID(id) || isTemporaryId(id)) {
      return { success: true, localOnly: true, item: { id, ...updates } };
    }

    if (
      (updates.base_price !== undefined && updates.base_price < 0) ||
      (updates.cost !== undefined && updates.cost < 0)
    ) {
      return { success: false, error: 'El precio base y el costo no pueden ser importes negativos.' };
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
      .eq('tenant_id', tenantId)
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
        .eq('tenant_id', tenantId)
        .select()
        .single();
      updatedItem = retry.data;
      error = retry.error;
    }

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

    safeRevalidate('/inventario');
    safeRevalidate('/catalogo');
    safeRevalidate('/caja');

    return { success: true, item: updatedItem };
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
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Catálogo está desactivado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // Blindaje defensivo contra IDs temporales: descartar localmente sin error 22P02
    if (!isValidUUID(id) || isTemporaryId(id)) {
      return { success: true, localOnly: true };
    }

    // Soft delete: preservar historial e integridad contable/fiscal
    let { error } = await supabaseAdmin
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error && (error.message.includes('deleted_at') || error.message.includes('column'))) {
      // Fallback: Si no existe la columna deleted_at, lo marcamos como inactivo (is_active: false)
      // NUNCA hacer un DELETE físico si ya tiene ventas, para evitar el error de foreign key.
      const retry = await supabaseAdmin
        .from('items')
        .update({ is_active: false })
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

    safeRevalidate('/inventario');
    safeRevalidate('/catalogo');
    safeRevalidate('/caja');

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

/**
 * Ajuste rápido de inventario (sumar/restar stock) sin pasar por POs.
 * Ideal para compras rápidas de mostrador sin proveedor formal o mermas.
 */
export async function adjustItemStockAction(
  id: string,
  quantityDelta: number,
  tenantId: string,
  actor: ActionActor,
  reason?: string
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!isValidUUID(id) || isTemporaryId(id)) {
      return { success: false, error: 'No se puede ajustar el stock de un ítem temporal o no sincronizado.' };
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

    // 2. Actualizar stock con fallback y registrar cuál columna se usó
    let _stockFieldUsed = 'stock';
    let error: any = null;
    const result = await supabaseAdmin
      .from('items')
      .update({ stock: newStock })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    error = result.error;

    if (error && (error.message.includes('stock') || error.message.includes('column'))) {
      // Intentar con stock_quantity
      const retryQty = await supabaseAdmin
        .from('items')
        .update({ stock_quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      error = retryQty.error;
      if (!error) _stockFieldUsed = 'stock_quantity';
    }

    if (error && (error.message.includes('quantity') || error.message.includes('column'))) {
      // Intentar con columna genérica quantity
      const retryQuantity = await supabaseAdmin
        .from('items')
        .update({ quantity: newStock })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      error = retryQuantity.error;
      if (!error) _stockFieldUsed = 'quantity';
    }

    if (error) throw new Error('Error al actualizar inventario: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
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
        reason: reason || 'Ajuste manual de inventario' 
      },
    });

    safeRevalidate('/inventario');
    safeRevalidate('/catalogo');
    safeRevalidate('/caja');

    return { success: true, newStock };
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

