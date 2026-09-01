'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { getMembershipsAction } from './memberships';

export interface AttendanceInput {
  entity_id: string;
  entity_type: 'employee' | 'customer';
  log_type: 'check_in' | 'check_out' | 'class_attendance';
  status?: 'present' | 'absent' | 'excused' | 'no_show';
  reference_id?: string | null;
  metadata?: unknown;
}

function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Trae los registros de asistencia con fallback JSONB automático.
 */
export async function getAttendanceLogsAction(tenantId: string, actor?: ActionActor) {
  try {
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        return { success: false, error: securityCheck.error || 'Acceso denegado.', logs: [] };
      }
    }

    const db = supabaseAdmin || supabase;

    // 1. Intentar leer de la tabla física 'attendance_logs'
    const { data, error } = await db
      .from('attendance_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      return { success: true, logs: data };
    }

    // 2. Fallback: Emulación JSONB en metadata de tenants
    if (error && isMissingTableError(error)) {
      const { data: tenant } = await db
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .maybeSingle();

      const emulated = tenant?.metadata?.attendance_logs || [];
      return { success: true, logs: emulated };
    }

    throw new Error(error?.message || 'Error al consultar asistencia.');
  } catch (error: unknown) {
    console.error('[getAttendanceLogsAction Error]:', error.message);
    return { success: false, error: error.message, logs: [] };
  }
}

/**
 * Registra un marcaje de asistencia de empleado o cliente, validando límites y descontando cupos.
 */
export async function registerAttendanceAction(
  payload: AttendanceInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const db = supabaseAdmin || supabase;
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // Validación de límites si es check-in de clase de un alumno
    if (payload.entity_type === 'customer' && payload.log_type === 'class_attendance') {
      const { memberships } = await getMembershipsAction(tenantId);
      const activeMship = (memberships || []).find(
        (m: unknown) => m.client_id === payload.entity_id && m.status === 'active'
      );

      if (activeMship) {
        const limit = activeMship.max_sessions_per_cycle;
        const used = activeMship.sessions_used_current_cycle || 0;

        if (limit !== null && limit !== undefined && used >= limit) {
          return {
            success: false,
            error: `El alumno ha alcanzado el límite máximo de clases permitidas en su mensualidad (${used}/${limit}).`,
            limitExceeded: true,
          };
        }

        // Incrementar el uso de la mensualidad si todo está bien
        activeMship.sessions_used_current_cycle = used + 1;
        
        // Guardamos el incremento de la mensualidad
        const isTableError = await updateMembershipCount(activeMship, tenantId);
        if (!isTableError.success) throw new Error(isTableError.error);
      }
    }

    const newLog = {
      id: `att-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(-4)}`,
      tenant_id: tenantId,
      entity_id: payload.entity_id,
      entity_type: payload.entity_type,
      log_type: payload.log_type,
      timestamp: new Date().toISOString(),
      status: payload.status || 'present',
      reference_id: payload.reference_id || null,
      metadata: payload.metadata || null,
    };

    // 1. Intentar insertar en tabla física 'attendance_logs'
    const { data, error } = await db
      .from('attendance_logs')
      .insert([newLog])
      .select()
      .single();

    if (!error && data) {
      revalidatePath('/equipo');
      revalidatePath('/calendario');
      return { success: true, log: data };
    }

    // 2. Fallback: Si la tabla no existe físicamente, guardar en la metadata de tenants
    if (error && isMissingTableError(error)) {
      const { data: tenant } = await db
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .single();

      const currentMetadata = tenant?.metadata || {};
      const currentList = currentMetadata.attendance_logs || [];
      const updatedList = [newLog, ...currentList];

      const { error: updateError } = await db
        .from('tenants')
        .update({
          metadata: {
            ...currentMetadata,
            attendance_logs: updatedList,
          },
        })
        .eq('id', tenantId);

      if (updateError) throw new Error(updateError.message);

      revalidatePath('/equipo');
      revalidatePath('/calendario');
      return { success: true, log: newLog };
    }

    throw new Error(error?.message || 'Error al guardar registro de asistencia.');
  } catch (error: unknown) {
    console.error('[registerAttendanceAction Error]:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Helper interno para guardar el incremento del uso de la membresía.
 */
async function updateMembershipCount(mship: unknown, tenantId: string) {
  try {
    const db = supabaseAdmin || supabase;
    const { error } = await db
      .from('memberships')
      .update({ sessions_used_current_cycle: mship.sessions_used_current_cycle })
      .eq('id', mship.id);

    if (!error) return { success: true };

    if (error && isMissingTableError(error)) {
      const { data: tenant } = await db
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .single();

      const currentMetadata = tenant?.metadata || {};
      const list = currentMetadata.memberships || [];
      const updated = list.map((m: unknown) => (m.id === mship.id ? mship : m));

      const { error: updateError } = await db
        .from('tenants')
        .update({
          metadata: {
            ...currentMetadata,
            memberships: updated,
          },
        })
        .eq('id', tenantId);

      if (updateError) throw new Error(updateError.message);
      return { success: true };
    }

    throw new Error(error.message);
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
