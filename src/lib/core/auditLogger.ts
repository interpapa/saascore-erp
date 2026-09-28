/**
 * Motor de Auditoría — Rendo
 * 
 * Registra todas las operaciones críticas (ventas, nóminas, anulaciones)
 * con trazabilidad completa: quién, qué, cuándo y desde dónde.
 * 
 * Solo se puede llamar desde Server Actions (usa supabaseAdmin).
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type AuditAction =
  | 'invoice.created'
  | 'invoice.voided'
  | 'payment.recorded'
  | 'payroll.processed'
  | 'item.deleted'
  | 'item.updated'
  | 'entity.updated'
  | 'journal_entry.created'
  | 'login.success'
  | 'login.failed'
  | 'permission.denied'
  | 'cash_session.opened'
  | 'cash_session.closed'
  | (string & {});

export interface AuditEntry {
  tenant_id: string;
  actor_email: string;      // El email del usuario que realizó la acción
  actor_role: string;       // El rol en el momento del acto
  action: AuditAction;
  target_type: string;      // 'document', 'item', 'entity', etc.
  target_id?: string;       // ID del recurso afectado
  metadata?: Record<string, unknown>; // TODO: definir tipo preciso
}

const CRITICAL_AUDIT_ACTIONS = [
  'invoice.created',
  'invoice.voided',
  'payment.recorded',
  'payroll.processed',
  'permission.denied',
  'login.failed',
  'entity.updated',
  'entity.created',
  'entity.deleted',
  'entity_record.created',
  'entity_record.deleted',
  'item.created',
  'item.updated',
  'item.deleted',
  'cash_session.opened',
  'cash_session.closed',
];

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const isCritical = CRITICAL_AUDIT_ACTIONS.includes(entry.action);
    const enableVerbose = entry.metadata?.enable_verbose_audit === true;

    // Si no es un evento crítico de seguridad/finanzas y no se ha solicitado registro detallado,
    // desviamos el log a la consola del servidor Next.js para optimizar almacenamiento en Supabase.
    if (!isCritical && !enableVerbose) {
      console.log(`[AUDIT ROUTINE LOG]: ${entry.actor_email} (${entry.actor_role}) -> ${entry.action} on ${entry.target_type} (${entry.target_id || 'N/A'})`);
      return;
    }

    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        ...entry,
        created_at: new Date().toISOString(),
        ip_address: 'server-action', // En producción, capturar desde el request header
      }]);

    if (error) {
      console.warn('⚠️  AUDIT LOG TABLE MISSING (using tenant metadata fallback):', error.message);
      try {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('metadata')
          .eq('id', entry.tenant_id)
          .maybeSingle();

        if (tenant) {
          const currentLogs = Array.isArray(tenant.metadata?.audit_logs) ? tenant.metadata.audit_logs : [];
          const newEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
            ...entry,
            created_at: new Date().toISOString(),
            ip_address: 'server-action',
          };
          const updatedLogs = [newEntry, ...currentLogs].slice(0, 100);
          await supabaseAdmin
            .from('tenants')
            .update({
              metadata: {
                ...tenant.metadata,
                audit_logs: updatedLogs,
              },
            })
            .eq('id', entry.tenant_id);
        }
      } catch (fallbackErr) {
        // Silencioso para no quebrar el hilo principal
      }
    }
  } catch (err) {
    console.error('⚠️  AUDIT LOG EXCEPTION (non-critical):', err);
  }
}
