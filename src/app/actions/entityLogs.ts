'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';

export interface EntityLogInput {
  entity_id: string; // ID de la Entidad (Cliente, Vehículo, Profesor)
  log_type: 'note' | 'alert_flag' | 'inspection_item' | 'history';
  title: string;
  details: string;
  status?: 'active' | 'resolved' | 'info_only';
  metadata?: unknown;
}

function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Trae la bitácora de anotaciones/inspecciones para un cliente o activo específico.
 */
export async function getEntityLogsAction(entityId: string, tenantId: string) {
  try {
    const db = supabaseAdmin || supabase;

    // 1. Intentar leer de la tabla física 'entity_logs'
    const { data, error } = await db
      .from('entity_logs')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return { success: true, logs: data };
    }

    // 2. Fallback: Leer de la columna JSONB 'metadata.logs' de la entidad física
    if (error && isMissingTableError(error)) {
      const { data: entity } = await db
        .from('entities')
        .select('metadata')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const emulated = entity?.metadata?.logs || [];
      return { success: true, logs: emulated };
    }

    throw new Error(error?.message || 'Error al consultar bitácora.');
  } catch (error: unknown) {
    console.error('[getEntityLogsAction Error]:', error.message);
    return { success: false, error: error.message, logs: [] };
  }
}

/**
 * Inserta un registro en la bitácora (diagnósticos, alertas, incidentes) de la entidad.
 */
export async function createEntityLogAction(
  payload: EntityLogInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const db = supabaseAdmin || supabase;
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const newLog = {
      id: `elog-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(-4)}`,
      tenant_id: tenantId,
      entity_id: payload.entity_id,
      log_type: payload.log_type,
      title: payload.title,
      details: payload.details,
      status: payload.status || 'info_only',
      metadata: payload.metadata || null,
      created_by: actor.email,
      created_at: new Date().toISOString(),
    };

    // 1. Intentar insertar en tabla física 'entity_logs'
    const { data, error } = await db
      .from('entity_logs')
      .insert([newLog])
      .select()
      .single();

    if (!error && data) {
      revalidatePath('/clientes');
      return { success: true, log: data };
    }

    // 2. Fallback: Si no existe, insertar en metadata de la entidad
    if (error && isMissingTableError(error)) {
      const { data: entity } = await db
        .from('entities')
        .select('metadata')
        .eq('id', payload.entity_id)
        .eq('tenant_id', tenantId)
        .single();

      const currentMetadata = entity?.metadata || {};
      const currentList = currentMetadata.logs || [];
      const updatedList = [newLog, ...currentList];

      const { error: updateError } = await db
        .from('entities')
        .update({
          metadata: {
            ...currentMetadata,
            logs: updatedList,
          },
        })
        .eq('id', payload.entity_id)
        .eq('tenant_id', tenantId);

      if (updateError) throw new Error(updateError.message);

      revalidatePath('/clientes');
      return { success: true, log: newLog };
    }

    throw new Error(error?.message || 'Error al guardar bitácora.');
  } catch (error: unknown) {
    console.error('[createEntityLogAction Error]:', error.message);
    return { success: false, error: error.message };
  }
}
