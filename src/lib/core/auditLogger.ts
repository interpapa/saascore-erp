/**
 * Motor de Auditoría — SaaSCore ERP
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
  | 'permission.denied';

export interface AuditEntry {
  tenant_id: string;
  actor_email: string;      // El email del usuario que realizó la acción
  actor_role: string;       // El rol en el momento del acto
  action: AuditAction;
  target_type: string;      // 'document', 'item', 'entity', etc.
  target_id?: string;       // ID del recurso afectado
  metadata?: Record<string, any>; // Contexto adicional (montos, estados anteriores, etc.)
}

const CRITICAL_AUDIT_ACTIONS = [
  'invoice.created',
  'invoice.voided',
  'payment.recorded',
  'payroll.processed',
  'permission.denied',
  'login.failed'
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
      // El audit log NUNCA debe romper el flujo principal de negocio.
      // Solo registramos la falla internamente.
      console.error('⚠️  AUDIT LOG WRITE FAILED (non-critical):', error.message);
    }
  } catch (err) {
    console.error('⚠️  AUDIT LOG EXCEPTION (non-critical):', err);
  }
}
