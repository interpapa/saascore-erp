'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Server Action para leer los logs de auditoría de un Tenant.
 * Filtrado opcional por tipo de recurso.
 */
export async function getAuditLogsAction(
  tenantId: string,
  targetType?: string,
  limit = 40
): Promise<{ success: boolean; logs: any[]; error?: string }> {
  try {
    if (!tenantId) {
      return { success: false, logs: [], error: 'El Tenant ID es requerido.' };
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getAuditLogsAction Error]:', error.message);
      return { success: false, logs: [], error: error.message };
    }

    return { success: true, logs: data || [] };
  } catch (err: any) {
    console.error('[getAuditLogsAction Exception]:', err);
    return { success: false, logs: [], error: err.message };
  }
}
