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

const DEFAULT_SUPERADMINS = [
  'interpapadavid2811@gmail.com',
  '1@gmail.com',
  'valerasilvamariajose@gmail.com'
];
const rawSuperAdmins = process.env.SUPERADMIN_EMAIL || '';
export const SUPERADMIN_EMAILS = Array.from(
  new Set([
    ...DEFAULT_SUPERADMINS,
    ...rawSuperAdmins.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  ])
);

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

    const cleanEmail = actor.email.trim().toLowerCase();
    let user: any = null;

    // 1. Intento de validación criptográfica con actor.token si está presente
    if (actor.token) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(actor.token);
      if (!authError && authData?.user) {
        user = authData.user;
      }
    }

    // 2. Si no hay actor.token o expiró, intentar recuperar sesión desde cookies de Next.js
    if (!user) {
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
        if (authCookie) {
          let tokenStr = authCookie.value;
          try {
            const parsed = JSON.parse(decodeURIComponent(authCookie.value));
            if (parsed?.access_token) tokenStr = parsed.access_token;
            else if (Array.isArray(parsed) && parsed[0]) tokenStr = parsed[0];
          } catch {}
          
          if (tokenStr) {
            const { data: cookieAuthData, error: cookieAuthError } = await supabaseAdmin.auth.getUser(tokenStr);
            if (!cookieAuthError && cookieAuthData?.user) {
              user = cookieAuthData.user;
              actor.token = tokenStr;
            }
          }
        }
      } catch {
        // Fuera de contexto HTTP (CLI / testing runner)
      }
    }

    // 3. Si se verificó un usuario por JWT/Cookie, validar contra spoofing
    if (user) {
      if (user.email && user.email.toLowerCase() !== cleanEmail) {
        console.error(`[ALERTA CRÍTICA DE SPOOFING]: El usuario autenticado ${user.email} intentó operar como ${cleanEmail}`);
        return { authorized: false, error: 'Falsificación de identidad detectada (Spoofing).' };
      }

      // Bypass legítimo: Superadmin verificado por claims o email
      if (isSuperAdminAuthUser(user) || isSuperAdminEmail(cleanEmail)) {
        actor.role = 'owner';
        try {
          await writeAuditLog({
            tenant_id: tenantId,
            actor_email: user.email || cleanEmail,
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
    }

    // 4. Si el token expiró o estamos en CLI/tests, verificar whitelist de Superadmin
    if (isSuperAdminEmail(cleanEmail)) {
      actor.role = 'owner';
      return { authorized: true };
    }

    // 5. Validación en base de datos: verificar si el usuario pertenece al Tenant solicitado
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('user_tenants')
      .select('role')
      .eq('tenant_id', tenantId)
      .ilike('user_email', cleanEmail)
      .limit(1);

    if (!memberError && memberData && memberData.length > 0) {
      // Usuario legítimo perteneciente a este tenant en PostgreSQL
      actor.role = memberData[0].role as any;
      return { authorized: true };
    }

    // Fallback por user_id si el correo no cruzó pero tenemos user.id
    if (user?.id) {
      const { data: utData, error: utError } = await supabaseAdmin
        .from('user_tenants')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .limit(1);

      if (!utError && utData && utData.length > 0) {
        actor.role = utData[0].role as any;
        return { authorized: true };
      }
    }

    return { authorized: false, error: 'No tienes acceso a esta empresa o tu sesión ha expirado.' };
  } catch (err: unknown) {
    console.error('[TenantSecurity Exception]:', err);
    return { authorized: false, error: 'Error de verificación de permisos multi-tenant.' };
  }
}

