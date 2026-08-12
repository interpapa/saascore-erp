'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkPermission, UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';

export interface ActionActor {
  email: string;
  role: UserRole;
}

export type EntityType = 'customer' | 'supplier' | 'employee' | 'lead' | 'branch';

export interface CreateEntityInput {
  type: EntityType;
  name: string;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
  status?: string;
  metadata?: Record<string, any>;
}

export async function createEntityAction(
  input: CreateEntityInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !input.name) {
      throw new Error('Empresa y Nombre son campos requeridos.');
    }

    const { data: newEntity, error } = await supabaseAdmin
      .from('entities')
      .insert([
        {
          tenant_id: tenantId,
          type: input.type,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          tax_id: input.tax_id || null,
          address: input.address || null,
          status: input.status || 'active',
          metadata: input.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw new Error('Error al guardar en la base de datos: ' + error.message);

    // Audit Log
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: newEntity.id,
      metadata: { action: 'created', type: input.type, name: input.name },
    });

    revalidatePath('/clientes');
    revalidatePath('/compras');
    revalidatePath('/equipo');
    revalidatePath('/franquicias');

    return { success: true, entity: newEntity };
  } catch (err: any) {
    console.error('[createEntityAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function updateEntityAction(
  id: string,
  updates: Partial<CreateEntityInput>,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    const { data: updatedEntity, error } = await supabaseAdmin
      .from('entities')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al actualizar entidad: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: id,
      metadata: { action: 'updated', updates },
    });

    revalidatePath('/clientes');
    revalidatePath('/compras');
    revalidatePath('/equipo');
    revalidatePath('/franquicias');

    return { success: true, entity: updatedEntity };
  } catch (err: any) {
    console.error('[updateEntityAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteEntityAction(
  id: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // Soft delete: marcar deleted_at en lugar de destruir la fila
    const { error } = await supabaseAdmin
      .from('entities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw new Error('Error al eliminar entidad: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: id,
      metadata: { action: 'soft_deleted' },
    });

    revalidatePath('/clientes');
    revalidatePath('/compras');
    revalidatePath('/equipo');
    revalidatePath('/franquicias');

    return { success: true };
  } catch (err: any) {
    console.error('[deleteEntityAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getEntitiesAction(tenantId: string, type?: EntityType, limit: number = 50) {
  try {
    if (!tenantId) return { success: true, entities: [] };

    let query = supabaseAdmin
      .from('entities')
      .select('id, tenant_id, type, name, email, phone, tax_id, address, status, metadata, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: entities, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, entities: entities || [] };
  } catch (err: any) {
    console.error('[getEntitiesAction Error]:', err.message);
    return { success: false, error: err.message, entities: [] };
  }
}

