/**
 * SaaSCore ERP - Herramienta de Impersonación de Usuarios ("Modo Dios" de Soporte)
 * 
 * Permite al equipo de soporte técnico/superadmin iniciar sesión temporal como
 * cualquier usuario específico para visualizar el ERP con sus permisos exactos
 * sin solicitar ni conocer su contraseña.
 */

import { UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';

export interface ImpersonationSession {
  token: string;
  superadminEmail: string;
  targetUserEmail: string;
  targetUserRole: UserRole;
  tenantId: string;
  expiresAt: string;
}

const activeImpersonations = new Map<string, ImpersonationSession>();

/**
 * Inicia una sesión de impersonación (máx 60 minutos de duración con audit log obligatorio).
 */
export async function startImpersonationSession(
  superadminEmail: string,
  targetUserEmail: string,
  targetUserRole: UserRole,
  tenantId: string
): Promise<{ success: boolean; session?: ImpersonationSession; error?: string }> {
  try {
    const token = `imp_${crypto.randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    const session: ImpersonationSession = {
      token,
      superadminEmail,
      targetUserEmail,
      targetUserRole,
      tenantId,
      expiresAt,
    };

    activeImpersonations.set(token, session);

    // Registro obligatorio en log de auditoría inmutable WORM
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: superadminEmail,
      actor_role: 'superadmin',
      action: 'permission.denied', // Categoría especial de control
      target_type: 'impersonation',
      target_id: targetUserEmail,
      metadata: { action: 'impersonation_started', targetRole: targetUserRole },
    });

    return { success: true, session };
  } catch (err: unknown) {
    console.error('[startImpersonationSession Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
