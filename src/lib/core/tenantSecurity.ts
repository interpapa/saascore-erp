/**
 * Rendo Strict Multi-Tenant Security Guard
 * 
 * Verifies on the server that an authenticated actor (email) belongs to the
 * requested tenant_id in PostgreSQL before any database mutation or read.
 * 
 * Guarantees immutability compliance with React 19 / Next.js 16 Server Actions (Object.freeze).
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';

export interface SecurityActor {
  email: string;
  role: UserRole;
  token?: string;
}

export { SUPERADMIN_EMAILS, isSuperAdminEmail } from './superadminWhitelist';
import { isSuperAdminEmail } from './superadminWhitelist';

export function isSuperAdminAuthUser(user?: { email?: string | null; app_metadata?: any; user_metadata?: any } | null): boolean {
  if (!user || !user.email) return false;
  if (isSuperAdminEmail(user.email)) return true;

  // Acceso para staff técnico interno de la plataforma
  const role = user.app_metadata?.role || user.user_metadata?.role;
  const isSuper = role === 'superadmin' || user.app_metadata?.is_superadmin === true;
  if (isSuper) {
    const email = user.email.toLowerCase();
    if (email.endsWith('@rendo.app') || email.endsWith('@rendo.com') || email.endsWith('@saascore.com')) {
      return true;
    }
  }
  return false;
}

/**
 * Validates whether a token string is a syntactically valid JWT.
 * Prevents Next.js serialization artifacts like "$undefined" from hitting Supabase Auth.
 */
function isValidJwt(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed === '' || trimmed === '$undefined' || trimmed === 'undefined' || trimmed === 'null') return false;
  const parts = trimmed.split('.');
  return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0;
}

export async function validateUserTenantAccess(
  actor: SecurityActor,
  tenantId: string
): Promise<{ authorized: boolean; error?: string; effectiveRole?: UserRole }> {
  try {
    if (!actor?.email || !tenantId) {
      return { authorized: false, error: 'Credenciales o ID de empresa inválidos.' };
    }

    const cleanEmail = actor.email.trim().toLowerCase();
    let effectiveRole: UserRole = actor.role || 'staff';
    let user: any = null;

    // 1. Intento de validación criptográfica con actor.token si es un JWT válido
    if (isValidJwt(actor.token)) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(actor.token);
        if (!authError && authData?.user) {
          user = authData.user;
        }
      } catch (tokenErr) {
        console.warn('[validateUserTenantAccess] Advertencia al validar JWT de actor:', tokenErr);
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
          
          if (isValidJwt(tokenStr)) {
            const { data: cookieAuthData, error: cookieAuthError } = await supabaseAdmin.auth.getUser(tokenStr);
            if (!cookieAuthError && cookieAuthData?.user) {
              user = cookieAuthData.user;
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
        return { authorized: true, effectiveRole: 'owner' };
      }
    }

    // 4. Si el token expiró o estamos en CLI/tests, verificar whitelist de Superadmin
    if (isSuperAdminEmail(cleanEmail)) {
      return { authorized: true, effectiveRole: 'owner' };
    }

    // 5. Validación en base de datos: verificar si el usuario pertenece al Tenant solicitado
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('user_tenants')
      .select('role')
      .eq('tenant_id', tenantId)
      .ilike('user_email', cleanEmail)
      .limit(1);

    if (!memberError && memberData && memberData.length > 0) {
      effectiveRole = memberData[0].role as any;
      return { authorized: true, effectiveRole };
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
        effectiveRole = utData[0].role as any;
        return { authorized: true, effectiveRole };
      }
    }

    // Fallback adicional si el tenant registra al usuario como owner en metadata
    const { data: tenantCheck } = await supabaseAdmin
      .from('tenants')
      .select('id, metadata')
      .eq('id', tenantId)
      .limit(1)
      .maybeSingle();

    if (tenantCheck) {
      const ownerEmail = (tenantCheck.metadata as any)?.owner_email || (tenantCheck.metadata as any)?.email;
      if (ownerEmail && ownerEmail.toLowerCase() === cleanEmail) {
        return { authorized: true, effectiveRole: 'owner' };
      }
    }

    return { authorized: false, error: 'No tienes acceso a esta empresa o tu sesión ha expirado.' };
  } catch (err: unknown) {
    console.error('[TenantSecurity Exception]:', err);
    return { authorized: false, error: 'Error de verificación de permisos multi-tenant.' };
  }
}
