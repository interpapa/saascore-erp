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

    const { data: newItem, error } = await supabaseAdmin
      .from('items')
      .insert([
        {
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
        },
      ])
      .select()
      .single();

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
    const { error } = await supabaseAdmin
      .from('items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

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

    let query = supabaseAdmin
      .from('items')
      .select('id, type, sku, name, description, category, base_price, cost, stock, is_active, metadata, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: items, error } = await query;

    if (error) throw new Error(error.message);

    // Map `stock` column to `stock_quantity` for interface compatibility
    const mappedItems = (items || []).map((item) => ({
      ...item,
      stock_quantity: item.stock ?? 0,
    }));

    return { success: true, items: mappedItems };
  } catch (err: any) {
    console.error('[getItemsAction Error]:', err.message);
    return { success: false, error: err.message, items: [] };
  }
}

