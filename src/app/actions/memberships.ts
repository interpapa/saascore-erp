'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';

export interface MembershipInput {
  client_id: string;
  item_id: string; // ID del Servicio contratado
  price: number;
  next_billing_date: string;
  notification_days_before?: number;
  max_sessions_per_cycle?: number | null;
  schedule_rules?: any;
  status?: 'active' | 'paused' | 'expired';
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Trae las mensualidades/membresías activas de un tenant con fallback JSONB automático.
 */
export async function getMembershipsAction(tenantId: string, actor?: ActionActor) {
  try {
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        return { success: false, error: securityCheck.error || 'Acceso denegado.', memberships: [] };
      }
    }
    
    const db = supabaseAdmin || supabase;

    // 1. Intentar leer de la tabla física 'memberships'
    const { data, error } = await db
      .from('memberships')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return { success: true, memberships: data };
    }

    // 2. Fallback: Si no existe la tabla, emular leyendo de la metadata del tenant
    if (error && isMissingTableError(error)) {
      const { data: tenant } = await db
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .maybeSingle();

      const emulated = tenant?.metadata?.memberships || [];
      return { success: true, memberships: emulated };
    }

    throw new Error(error?.message || 'Error al consultar mensualidades.');
  } catch (error: any) {
    console.error('[getMembershipsAction Error]:', error.message);
    return { success: false, error: error.message, memberships: [] };
  }
}

/**
 * Registra una nueva mensualidad/membresía con fallback JSONB automático.
 */
export async function createMembershipAction(
  payload: MembershipInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const db = supabaseAdmin || supabase;
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const newMembership = {
      id: `mship-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(-4)}`,
      tenant_id: tenantId,
      client_id: payload.client_id,
      item_id: payload.item_id,
      price: payload.price,
      next_billing_date: payload.next_billing_date,
      notification_days_before: payload.notification_days_before || 2,
      max_sessions_per_cycle: payload.max_sessions_per_cycle ?? null,
      sessions_used_current_cycle: 0,
      schedule_rules: payload.schedule_rules || null,
      status: payload.status || 'active',
      created_at: new Date().toISOString(),
    };

    // 1. Intentar insertar en tabla física 'memberships'
    const { data, error } = await db
      .from('memberships')
      .insert([newMembership])
      .select()
      .single();

    if (!error && data) {
      revalidatePath('/clientes');
      return { success: true, membership: data };
    }

    // 2. Fallback: Si la tabla no existe físicamente, guardar en la metadata de tenants
    if (error && isMissingTableError(error)) {
      const { data: tenant } = await db
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .single();

      const currentMetadata = tenant?.metadata || {};
      const currentList = currentMetadata.memberships || [];
      const updatedList = [newMembership, ...currentList];

      const { error: updateError } = await db
        .from('tenants')
        .update({
          metadata: {
            ...currentMetadata,
            memberships: updatedList,
          },
        })
        .eq('id', tenantId);

      if (updateError) throw new Error(updateError.message);

      revalidatePath('/clientes');
      return { success: true, membership: newMembership };
    }

    throw new Error(error?.message || 'Error al guardar membresía.');
  } catch (error: any) {
    console.error('[createMembershipAction Error]:', error.message);
    return { success: false, error: error.message };
  }
}
