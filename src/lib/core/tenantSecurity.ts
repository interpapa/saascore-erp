/**
 * Rendo Strict Multi-Tenant Security Guard
 * 
 * Verifies on the server that an authenticated actor (email) belongs to the
 * requested tenant_id in PostgreSQL before any database mutation or read.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';

export interface SecurityActor {
  email: string;
  role: UserRole;
  token?: string;
}

const DEFAULT_SUPERADMIN = 'interpapadavid2811@gmail.com';
const rawSuperAdmins = process.env.SUPERADMIN_EMAIL || DEFAULT_SUPERADMIN;
export const SUPERADMIN_EMAILS = rawSuperAdmins
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return SUPERADMIN_EMAILS.includes(clean);
}

export function isSuperAdminAuthUser(user?: { email?: string | null; app_metadata?: any; user_metadata?: any } | null): boolean {
  if (!user) return false;
  if (isSuperAdminEmail(user.email)) return true;
  if (user.app_metadata?.role === 'superadmin' || user.app_metadata?.is_superadmin === true) return true;
  if (user.user_metadata?.role === 'superadmin' || user.user_metadata?.is_superadmin === true) return true;
  return false;
}

export async function validateUserTenantAccess(
  actor: SecurityActor,
  tenantId: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    if (!actor?.email || !tenantId) {
      return { authorized: false, error: 'Credenciales o ID de empresa inválidos.' };
    }

    // [PARCHE DE SEGURIDAD EXTREMA]: Cero Confianza en el Cliente (Zero-Trust)
    // El servidor ya no confía en el 'actor.email' que envía el navegador, ya que podría ser falsificado (Spoofing / IDOR).
    // Ahora, extraemos la sesión real criptográficamente usando el token JWT proporcionado.
    if (!actor.token) {
      console.warn(`[ALERTA DE SEGURIDAD]: Intento de acceso sin token JWT a tenant ${tenantId} por ${actor.email}`);
      return { authorized: false, error: 'Token de seguridad requerido. Falsificación de sesión detectada.' };
    }

    // Verificamos criptográficamente el token con Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(actor.token);
    
    if (authError || !user) {
      console.warn(`[ALERTA DE SEGURIDAD]: Token inválido o expirado para ${actor.email}`);
      return { authorized: false, error: 'Sesión expirada o inválida. Vuelve a iniciar sesión.' };
    }

    if (user.email?.toLowerCase() !== actor.email.toLowerCase()) {
      console.error(`[ALERTA CRÍTICA DE SPOOFING]: El usuario ${user.email} intentó suplantar a ${actor.email}`);
      return { authorized: false, error: 'Falsificación de identidad detectada (Spoofing).' };
    }

    // A partir de este punto, sabemos al 100% que el usuario es quien dice ser.

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BYPASS LEGÍTIMO: Modo Soporte Técnico Superadmin (Impersonación de Tenants)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isSuperAdminAuthUser(user)) {
      actor.role = 'owner';
      try {
        await writeAuditLog({
          tenant_id: tenantId,
          actor_email: user.email || actor.email,
          actor_role: 'superadmin',
          action: 'impersonation.access_granted',
          target_type: 'tenant',
          target_id: tenantId,
          metadata: {
            reason: 'Bypass legítimo para soporte técnico de Superadmin verificado por JWT',
            impersonated_tenant_id: tenantId,
            impersonated_at: new Date().toISOString()
          }
        });
      } catch (auditErr) {
        console.warn('[validateUserTenantAccess] Advertencia al registrar auditoría de impersonación:', auditErr);
      }
      return { authorized: true };
    }
    // Procedemos a verificar si este usuario legítimo pertenece al Tenant solicitado.
    
    const { data, error } = await supabaseAdmin
      .from('user_tenants')
      .select('role')
      .eq('tenant_id', tenantId)
      .ilike('user_email', user.email.trim())
      .limit(1);

    if (!error && data && data.length > 0) {
      // INYECCIÓN DE SEGURIDAD: Sobrescribimos el rol del cliente con el rol real de la BD
      actor.role = data[0].role as any;
      return { authorized: true };
    }

    // Fallback por user_id si el correo no cruza
    if (error?.message?.includes('user_email') || error?.message?.includes('column') || (data && data.length === 0)) {
      const { data: utData, error: utError } = await supabaseAdmin
        .from('user_tenants')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .limit(1);

      if (!utError && utData && utData.length > 0) {
        // INYECCIÓN DE SEGURIDAD: Sobrescribimos el rol del cliente con el rol real de la BD
        actor.role = utData[0].role as any;
        return { authorized: true };
      }
    }

    return { authorized: false, error: 'No tienes acceso a esta empresa.' };
  } catch (err: unknown) {
    console.error('[TenantSecurity Exception]:', err);
    return { authorized: false, error: 'Error de verificación de permisos multi-tenant.' };
  }
}

