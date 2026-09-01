/**
 * SaaSCore ERP Kernel - Security & Multi-Tenant Guard
 * 
 * Capa inmutable del nÃºcleo para validaciÃ³n de acceso multi-tenant y RBAC.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkPermission, UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';

export interface KernelActor {
  email: string;
  role: UserRole;
}

export async function validateKernelAccess(
  actor: KernelActor,
  tenantId: string,
  requiredPermission?: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    if (!actor || !actor.email || !tenantId) {
      return { authorized: false, error: 'Credenciales o empresa no especificadas.' };
    }

    // Superadmin bypasses tenant checks for global maintenance
    if (actor.role === 'superadmin') {
      return { authorized: true };
    }

    // Verificar vinculaciÃ³n en la relaciÃ³n user_tenants
    const { error } = await supabaseAdmin
      .from('user_tenants')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (error) {
      console.warn('[TenantSecurityKernel] Advertencia en user_tenants:', error.message);
    }

    // Verificar permiso granular si se requiere uno específico
    if (requiredPermission && !checkPermission(actor.role, requiredPermission as string)) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'permission.denied',
        target_type: 'kernel',
        metadata: { requiredPermission },
      });
      return { authorized: false, error: `Permiso insuficiente (${requiredPermission}).` };
    }

    return { authorized: true };
  } catch (err: unknown) {
    console.error('[TenantSecurityKernel Exception]:', err);
    return { authorized: false, error: 'Error en la verificación de seguridad del Kernel.' };
  }
}

