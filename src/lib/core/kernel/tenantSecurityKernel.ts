/**
 * Rendo Kernel - Security & Multi-Tenant Guard
 * 
 * Capa inmutable del núcleo para validación de acceso multi-tenant y RBAC.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkPermission, UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { assertModuleEnabled, ModuleId } from '@/lib/core/kernel/moduleRegistry';

export interface KernelActor {
  email: string;
  role: UserRole;
  token?: string; // Token JWT para verificación criptográfica Zero-Trust
}

export async function validateKernelAccess(
  actor: KernelActor,
  tenantId: string,
  requiredPermission?: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    if (!actor?.email || !tenantId) {
      return { authorized: false, error: 'Credenciales o empresa no especificadas.' };
    }

    // Zero-Trust: Si se proporciona token, verificar criptográficamente antes de consultar la BD
    if (actor.token) {
      const { data: { user }, error: jwtError } = await supabaseAdmin.auth.getUser(actor.token);
      if (jwtError || !user) {
        return { authorized: false, error: 'Token de sesión inválido o expirado.' };
      }
      if (user.email?.toLowerCase() !== actor.email.trim().toLowerCase()) {
        return { authorized: false, error: 'El token no corresponde al actor declarado.' };
      }
    }

    // Verify user belongs to tenant via user_tenants table
    const { data, error } = await supabaseAdmin
      .from('user_tenants')
      .select('role')
      .eq('tenant_id', tenantId)
      .ilike('user_email', actor.email.trim())
      .limit(1);

    const isLinked = !error && data && data.length > 0;

    if (!isLinked) {
      return { authorized: false, error: 'No tienes acceso a esta empresa.' };
    }

    // Verificar permiso granular si se requiere uno específico
    if (requiredPermission && !checkPermission(actor.role, requiredPermission)) {
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

    // Validación Backend de Módulo Activo (Estilo Odoo 17)
    // Solo validamos módulos opcionales cuyo ID coincide exactamente con un ModuleId válido.
    // Los permisos RBAC como 'crm' o 'finanzas' NO son ModuleId y se omiten aquí.
    const MODULE_IDS_OPTIONAL = new Set<string>([
      'contabilidad', 'compras', 'caja', 'calendario', 'equipo', 'whatsapp', 'kanban',
      'catalogo', 'clientes', 'estadisticas', 'franquicias', 'integraciones',
    ]);
    if (requiredPermission && MODULE_IDS_OPTIONAL.has(requiredPermission)) {
      const moduleCheck = await assertModuleEnabled(tenantId, requiredPermission as ModuleId);
      if (!moduleCheck.authorized) {
        return { authorized: false, error: moduleCheck.error };
      }
    }

    return { authorized: true };
  } catch (err: unknown) {
    console.error('[TenantSecurityKernel Exception]:', err);
    return { authorized: false, error: 'Error en la verificación de seguridad del Kernel.' };
  }
}

