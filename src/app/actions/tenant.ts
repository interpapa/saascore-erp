'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { UserRole } from '@/lib/rbac';
import { validateUserTenantAccess, isSuperAdminEmail, isSuperAdminAuthUser, SUPERADMIN_EMAILS } from '@/lib/core/tenantSecurity';
import { DEFAULT_ENABLED_MODULES } from '@/lib/core/kernel/moduleRegistry';
import { getResolvedSupabaseUrl, getResolvedAnonKey } from '@/lib/supabaseConfig';
import { cookies } from 'next/headers';

async function verifySuperAdminActor(
  callerOrActor?: ActionActor | string | null,
  token?: string
): Promise<{ authorized: boolean; error?: string }> {
  let email = '';
  let authToken = token;

  if (typeof callerOrActor === 'object' && callerOrActor !== null) {
    email = callerOrActor.email || '';
    authToken = authToken || callerOrActor.token;
  } else if (typeof callerOrActor === 'string') {
    email = callerOrActor;
  }

  // 1. Verificación instantánea por lista blanca de superadmin (0ms de latencia)
  if (email && isSuperAdminEmail(email)) {
    return { authorized: true };
  }

  // 2. Si no hay token en el actor, intentar recuperar sesión desde cookies de Next.js
  if (!authToken) {
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      const authCookie = allCookies.find(c => c.name.includes('-auth-token'));
      if (authCookie) {
        let tokenStr = authCookie.value;
        try {
          const parsed = JSON.parse(decodeURIComponent(authCookie.value));
          if (parsed?.access_token) tokenStr = parsed.access_token;
          else if (Array.isArray(parsed) && parsed[0]) tokenStr = parsed[0];
          if (parsed?.user?.email && (isSuperAdminEmail(parsed.user.email) || isSuperAdminAuthUser(parsed.user))) {
            return { authorized: true };
          }
        } catch {}
        if (tokenStr) authToken = tokenStr;
      }
    } catch {
      // Fuera de contexto HTTP o testing
    }
  }

  // 4. Validación criptográfica vía Supabase Auth si hay token
  if (authToken) {
    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken);
      if (!authError && user && isSuperAdminAuthUser(user)) {
        return { authorized: true };
      }
    } catch {
      // ignore
    }
  }

  return { authorized: false, error: 'No autorizado. Se requiere acceso verificado de Super Administrador con token de sesión válido.' };
}

export async function createTenantAdminAction(
  name: string,
  ownerEmail?: string,
  plan: string = 'pro',
  actor?: ActionActor | string
) {
  try {
    if (!actor) {
      return { success: false, error: 'Actor de sesión requerido.' };
    }
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    if (!name?.trim()) {
      return { success: false, error: 'El nombre del negocio es obligatorio.' };
    }

    const cleanEmail = (ownerEmail || '').trim().toLowerCase();
    const actorEmail = typeof actor === 'object' ? actor.email : actor;
    const db = supabaseAdmin;

    const initialModules = ['inventario', 'ventas', 'caja', 'compras', 'clientes', 'estadisticas', 'config'];

    let insertTenant: unknown = {
      name: name.trim(),
      is_active: true,
      active_modules: initialModules,
      currency: 'USD',
      symbol: '$',
      country_code: 'VE',
      metadata: {
        plan,
        created_by_admin: actorEmail,
        active_modules: initialModules,
      }
    };

    let { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert([insertTenant])
      .select()
      .single();

    if (tenantError && (tenantError.message.includes('column') || tenantError.message.includes('active_modules') || tenantError.message.includes('is_active'))) {
      insertTenant = {
        name: name.trim(),
        status: 'active',
        metadata: {
          plan,
          is_active: true,
          active_modules: initialModules,
          currency: 'USD',
          symbol: '$',
          country_code: 'VE',
        }
      };
      const retry = await db
        .from('tenants')
        .insert([insertTenant])
        .select()
        .single();
      tenant = retry.data;
      tenantError = retry.error;
    }

    if (tenantError) throw new Error('Error al crear el tenant: ' + tenantError.message);

    if (cleanEmail && tenant?.id) {
      await db.from('user_tenants').insert([{
        user_email: cleanEmail,
        tenant_id: tenant.id,
        role: 'owner'
      }]);
    }

    await writeAuditLog({
      tenant_id: tenant.id,
      actor_email: actorEmail || 'system',
      actor_role: 'superadmin',
      action: 'TENANT_CREATED',
      target_type: 'tenant',
      target_id: tenant.id,
      metadata: { name: tenant.name, plan, ownerEmail: cleanEmail }
    });

    revalidatePath('/admin');
    revalidatePath('/admin/billing');
    return { success: true, tenant };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function createTenant(userId: string, userEmail: string, businessName: string) {
  try {
    const db = supabaseAdmin;
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const cleanName = (businessName || '').trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'El nombre de la empresa debe tener al menos 2 caracteres.' };
    }

    // 0. Idempotencia: Verificar si el usuario ya tiene una empresa vinculada previamente
    if (cleanEmail || userId) {
      let query = db.from('user_tenants').select('tenant_id, role');
      if (cleanEmail) query = query.ilike('user_email', cleanEmail);
      else if (userId) query = query.eq('user_id', userId);

      const { data: existingLinks } = await query.limit(1);
      if (existingLinks && existingLinks.length > 0) {
        const { data: existingTenant } = await db
          .from('tenants')
          .select('*')
          .eq('id', existingLinks[0].tenant_id)
          .single();

        if (existingTenant) {
          return { success: true, tenant: existingTenant };
        }
      }
    }

    // 1. Crear el Tenant con permisos de servidor y módulos predeterminados completos
    const insertTenant = {
      name: cleanName,
      status: 'active',
      is_active: true,
      currency: 'USD',
      symbol: '$',
      country_code: 'VE',
      active_modules: DEFAULT_ENABLED_MODULES,
      metadata: {
        created_at: new Date().toISOString(),
        plan: 'pro',
        active_modules: DEFAULT_ENABLED_MODULES,
      }
    };

    let { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert([insertTenant])
      .select()
      .single();

    if (tenantError) {
      // Fallback en caso de que alguna columna estricta varíe
      const fallbackInsert = {
        name: cleanName,
        status: 'active',
        metadata: {
          is_active: true,
          currency: 'USD',
          symbol: '$',
          country_code: 'VE',
          active_modules: DEFAULT_ENABLED_MODULES,
        }
      };
      const retry = await db
        .from('tenants')
        .insert([fallbackInsert])
        .select()
        .single();
      tenant = retry.data;
      tenantError = retry.error;
    }

    if (tenantError || !tenant) {
      throw new Error('Error al crear la empresa: ' + (tenantError?.message || 'Error desconocido'));
    }

    // 2. Vincular el Usuario con el Tenant en user_tenants
    const linkPayload: Record<string, unknown> = {
      tenant_id: tenant.id,
      role: 'owner',
    };
    if (cleanEmail) linkPayload.user_email = cleanEmail;
    if (userId) linkPayload.user_id = userId;

    let { error: linkError } = await db
      .from('user_tenants')
      .insert([linkPayload]);

    if (linkError) {
      // Reintentar solo con user_email o solo con user_id
      const fallbackLink = cleanEmail ? { user_email: cleanEmail, tenant_id: tenant.id, role: 'owner' } : { user_id: userId, tenant_id: tenant.id, role: 'owner' };
      const retryLink = await db.from('user_tenants').insert([fallbackLink]);
      linkError = retryLink.error;
    }

    if (linkError) {
      await db.from('tenants').delete().eq('id', tenant.id);
      throw new Error('Error al vincular el usuario con la empresa: ' + linkError.message);
    }

    await writeAuditLog({
      tenant_id: tenant.id,
      actor_email: cleanEmail || 'onboarding',
      actor_role: 'owner',
      action: 'tenant.created_via_onboarding',
      target_type: 'tenant',
      target_id: tenant.id,
      metadata: { name: cleanName }
    });

    return { success: true, tenant };
  } catch (error: any) {
    console.error('[createTenant Error]:', error);
    return { success: false, error: error.message };
  }
}

export async function updateTenantSettings(
  tenantId: string,
  name: string,
  metadata: unknown,
  activeModules: string[] | undefined,
  actor: ActionActor
) {
  try {
    if (!actor) {
      return { success: false, error: 'Actor de sesión requerido para modificar la configuración de la empresa.' };
    }

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado a la configuración.' };
    }

    const db = supabaseAdmin;

    // Construir payload — si viene activeModules, lo escribimos en la columna directa
    // para que moduleRegistry lo lea sin depender del JSONB metadata.
    const updatePayload: Record<string, unknown> = { name, metadata };
    if (activeModules !== undefined) {
      updatePayload.active_modules = activeModules;
    }

    const { data: tenant, error } = await db
      .from('tenants')
      .update(updatePayload)
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al actualizar configuración: ' + error.message);

    // Invalidar caché de módulos para este tenant
    if (activeModules !== undefined) {
      const { invalidateModuleCache } = await import('@/lib/core/kernel/moduleRegistry');
      invalidateModuleCache(tenantId);
    }

    revalidatePath('/configuracion');
    revalidatePath('/dashboard');
    revalidatePath('/apps');
    return { success: true, tenant };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update only the tenant metadata (e.g., theme settings).
 * Validates that provided colors are hex strings.
 */
export async function updateTenantMetadataAction(
  tenantId: string,
  metadataUpdates: { public_theme?: { bgColor?: string; btnColor?: string } },
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const db = supabaseAdmin;
    // Fetch current metadata
    const { data: tenant, error: fetchError } = await db
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();
    if (fetchError) throw new Error('Error fetching tenant: ' + fetchError.message);
    const currentMeta = (tenant?.metadata as any) || {};
    const newMeta = { ...currentMeta, ...metadataUpdates };
    // Validate colors if present
    if (newMeta.public_theme) {
      const { bgColor, btnColor } = newMeta.public_theme;
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (bgColor && !hexRegex.test(bgColor)) {
        throw new Error('bgColor must be a valid hex color');
      }
      if (btnColor && !hexRegex.test(btnColor)) {
        throw new Error('btnColor must be a valid hex color');
      }
    }
    const { data: updated, error: updateError } = await db
      .from('tenants')
      .update({ metadata: newMeta })
      .eq('id', tenantId)
      .select()
      .single();
    if (updateError) throw new Error('Error updating metadata: ' + updateError.message);
    revalidatePath('/configuracion');
    revalidatePath('/dashboard');
    return { success: true, tenant: updated };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getAllTenants(callerOrActor?: ActionActor | string | null, token?: string) {
  try {
    const authCheck = await verifySuperAdminActor(callerOrActor, token);
    if (!authCheck.authorized) {
      return { success: false, tenants: [], error: authCheck.error || 'No autorizado. Se requiere acceso de Super Administrador.' };
    }
    const db = supabaseAdmin;
    let { data: tenants, error } = await db
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const retry = await db.from('tenants').select('*');
      if (!retry.error && retry.data) {
        tenants = retry.data;
        error = null;
      }
    }

    if (error) {
      console.error('[getAllTenants error]:', error);
      return { success: false, tenants: [], error: error.message };
    }

    const normalizedTenants = (tenants || []).map((t: any) => ({
      ...t,
      status: t.status || (t.is_active !== false ? 'active' : 'suspended'),
      is_active: t.is_active !== false && t.status !== 'suspended',
      subscription_plan: t.subscription_plan || (t.metadata as any)?.plan || 'pro',
      active_modules: Array.isArray(t.active_modules) && t.active_modules.length > 0 
        ? t.active_modules 
        : ((t.metadata as any)?.active_modules || DEFAULT_ENABLED_MODULES)
    }));

    return { success: true, tenants: normalizedTenants };
  } catch (error: any) {
    console.error('[getAllTenants catch]:', error);
    return { success: false, tenants: [], error: error.message };
  }
}

export async function toggleTenantStatus(tenantId: string, newStatus: 'active' | 'suspended', callerOrActor: ActionActor | string, token?: string) {
  try {
    const authCheck = await verifySuperAdminActor(callerOrActor, token);
    if (!authCheck.authorized) {
      throw new Error(authCheck.error || 'No autorizado. Se requiere acceso de Super Administrador.');
    }
    const db = supabaseAdmin;
    const is_active = newStatus === 'active';
    
    let { error } = await db
      .from('tenants')
      .update({ is_active })
      .eq('id', tenantId);

    if (error && (error.message.includes('is_active') || error.message.includes('column'))) {
      // Fallback: update status column instead of is_active (migration_run schema)
      const retry = await db
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenantId);
      error = retry.error;
    }

    if (error) throw new Error('Error updating status: ' + error.message);
    
    revalidatePath('/admin');
    revalidatePath('/admin/billing');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function sanitizeTenantPayload(tenant: any) {
  if (!tenant) return null;
  const rawMeta = (tenant.metadata || {}) as Record<string, any>;
  const cleanMetadata = {
    plan: rawMeta.plan || 'pro',
    currency: rawMeta.currency || tenant.currency || 'USD',
    symbol: rawMeta.symbol || tenant.symbol || '$',
    exchange_rate: rawMeta.exchange_rate || 850.0,
    active_modules: tenant.active_modules || rawMeta.active_modules || DEFAULT_ENABLED_MODULES,
    booking_settings: rawMeta.booking_settings,
    public_theme: rawMeta.public_theme,
    integraciones: rawMeta.integraciones,
  };

  return {
    ...tenant,
    active_modules: tenant.active_modules || cleanMetadata.active_modules,
    metadata: cleanMetadata,
  };
}

export async function getUserTenant(userEmail: string, userId?: string) {
  try {
    const db = supabaseAdmin;
    const cleanEmail = (userEmail || '').trim();

    if (!cleanEmail) {
      return { success: false, tenant: null, role: null };
    }

    const isSuperAdmin = isSuperAdminEmail(cleanEmail);

    // 1. Buscar relación user_tenants por email
    const userTenantsRes = await db
      .from('user_tenants')
      .select('tenant_id, role, created_at')
      .ilike('user_email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(1);

    let userTenants = userTenantsRes.data;
    let utError = userTenantsRes.error;

    if (utError || !userTenants || userTenants.length === 0) {
      if (isSuperAdmin) {
        return { success: true, tenant: null, role: 'superadmin' };
      }

      // El usuario está autenticado pero no tiene empresa asociada -> Debe configurar su empresa en Onboarding
      return { success: true, tenant: null, role: 'owner' as UserRole };
    }

    const membership = userTenants[0];

    // 2. Traer información del Tenant
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('*')
      .eq('id', membership.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return { success: false, tenant: null, role: null, error: 'Tenant not found' };
    }

    return {
      success: true,
      tenant: sanitizeTenantPayload(tenant),
      role: isSuperAdmin ? 'superadmin' : (membership.role as UserRole),
    };
  } catch (error: any) {
    return { success: false, tenant: null, role: null, error: error.message };
  }
}

export async function getTenantByIdAdmin(tenantId: string, callerOrActor: ActionActor | string, token?: string) {
  try {
    const authCheck = await verifySuperAdminActor(callerOrActor, token);
    if (!authCheck.authorized) {
      return { success: false, tenant: null, error: authCheck.error || 'No autorizado' };
    }
    const db = supabaseAdmin;
    const { data: tenant, error } = await db
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;
    return { success: true, tenant };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateTenantAdminAction(tenantId: string, updates: any, callerOrActor: ActionActor | string, token?: string) {
  try {
    const authCheck = await verifySuperAdminActor(callerOrActor, token);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error || 'No autorizado' };
    }
    const db = supabaseAdmin;
    let { data: tenant, error } = await db
      .from('tenants')
      .update({
        name: updates.name,
        active_modules: updates.active_modules,
        metadata: updates.metadata
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error && (error.message.includes('active_modules') || error.message.includes('column'))) {
      // Fallback: Si no existe active_modules en la BD, lo guardamos temporalmente dentro de metadata
      const fallbackMetadata = {
        ...(updates.metadata || {}),
        active_modules: updates.active_modules
      };
      const retry = await db
        .from('tenants')
        .update({
          name: updates.name,
          metadata: fallbackMetadata
        })
        .eq('id', tenantId)
        .select()
        .single();
      
      tenant = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Invalidar caché de módulos para este tenant
    if (updates.active_modules !== undefined) {
      const { invalidateModuleCache } = await import('@/lib/core/kernel/moduleRegistry');
      invalidateModuleCache(tenantId);
    }

    revalidatePath('/admin');
    revalidatePath(`/admin/tenant/${tenantId}`);
    revalidatePath('/dashboard');
    revalidatePath('/apps');
    revalidatePath('/configuracion');

    return { success: true, tenant };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteTenantAdminAction(tenantId: string, callerOrActor: ActionActor | string, token?: string) {
  try {
    const authCheck = await verifySuperAdminActor(callerOrActor, token);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error || 'No autorizado' };
    }
    const db = supabaseAdmin;
    const { error } = await db
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Permite al Administrador/Dueño crear una cuenta de acceso para un empleado
 * con contraseña temporal auto-confirmada para acceso inmediato.
 */
export async function createTenantUserAction(
  tenantId: string,
  userEmail: string,
  temporaryPassword: string,
  role: UserRole,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }
    if (actor.role !== 'owner' && actor.role !== 'manager' && actor.role !== 'superadmin') {
      return { success: false, error: 'Solo los administradores o dueños pueden crear cuentas de acceso.' };
    }

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (!cleanEmail || !temporaryPassword || temporaryPassword.length < 6) {
      return { success: false, error: 'Correo y contraseña válida (mínimo 6 caracteres) requeridos.' };
    }

    // 1. Crear el usuario en Supabase Auth mediante admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role, tenant_id: tenantId }
    });

    let userId = newUser?.user?.id;

    if (createError) {
      if (createError.message.toLowerCase().includes('already registered')) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list?.users.find(u => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          userId = existing.id;
        } else {
          return { success: false, error: 'Este correo ya está registrado en la plataforma.' };
        }
      } else {
        return { success: false, error: 'Error al registrar usuario: ' + createError.message };
      }
    }

    if (!userId) {
      return { success: false, error: 'No se pudo obtener el identificador del usuario.' };
    }

    // 2. Vincular a user_tenants
    const { error: linkError } = await supabaseAdmin.from('user_tenants').upsert([
      {
        tenant_id: tenantId,
        user_email: cleanEmail,
        role
      }
    ]);

    if (linkError) {
      return { success: false, error: 'Error al asignar permisos a la empresa: ' + linkError.message };
    }

    revalidatePath('/configuracion');
    return { success: true, email: cleanEmail };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Lista los usuarios autorizados de una empresa.
 */
export async function getTenantUsersAction(tenantId: string, actor: ActionActor) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', users: [] };
    }

    const { data, error } = await supabaseAdmin
      .from('user_tenants')
      .select('id, user_email, role, created_at')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return { success: true, users: data || [] };
  } catch (err: any) {
    return { success: false, error: (err as Error).message, users: [] };
  }
}

/**
 * Permite a un usuario autenticado actualizar su propia contraseña de forma segura desde el backend.
 */
export async function updateCurrentUserPasswordAction(
  newPassword: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    }

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (actor.role !== 'owner' && actor.role !== 'superadmin') {
      return { 
        success: false, 
        error: 'Por políticas de seguridad, solo el Dueño de la empresa puede autorizar o modificar contraseñas.' 
      };
    }

    if (!actor.token) {
      return { success: false, error: 'Token de sesión requerido para cambiar la contraseña.' };
    }

    const userSupabase = createClient(
      getResolvedSupabaseUrl(),
      getResolvedAnonKey(),
      { global: { headers: { Authorization: `Bearer ${actor.token}` } } }
    );

    const { error } = await userSupabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'user.password_changed',
      target_type: 'user',
    });

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Consulta la lista de usuarios y roles vinculados a un tenant específico para administración centralizada.
 */
export async function getTenantUsersAdminAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; users?: any[]; error?: string }> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, users: [], error: authCheck.error };
    }
    const db = supabaseAdmin;
    const { data: users, error } = await db
      .from('user_tenants')
      .select('id, user_email, role, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, users: users || [] };
  } catch (err: any) {
    return { success: false, users: [], error: err.message };
  }
}

/**
 * Permite al Super Administrador resetear forzosamente la contraseña de cualquier usuario en Supabase Auth.
 */
export async function resetTenantUserPasswordAdminAction(
  userEmail: string,
  newPassword: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    const cleanEmail = userEmail.trim().toLowerCase();
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = list?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado en la base de datos de autenticación.' };
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });
    if (updateError) throw updateError;

    await writeAuditLog({
      tenant_id: 'SYSTEM',
      actor_email: actor.email,
      actor_role: 'superadmin',
      action: 'user.password_changed',
      target_type: 'auth_user',
      target_id: cleanEmail,
      metadata: { adminReset: true }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Consulta la telemetría viva de Supabase (latencia de DB, tenants totales, usuarios y transacciones).
 */
export async function getSystemHealthAdminAction(
  actor: ActionActor
): Promise<{
  success: boolean;
  data?: {
    status: 'healthy' | 'degraded';
    latencyMs: number;
    tenantsCount: number;
    usersCount: number;
    todayDocsCount: number;
    timestamp: string;
  };
  error?: string;
}> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const start = performance.now();
    const db = supabaseAdmin;
    
    // Medir latencia de respuesta consultando conteo de tenants
    const { count: tenantsCount, error: tErr } = await db
      .from('tenants')
      .select('*', { count: 'exact', head: true });
    const latencyMs = Math.round(performance.now() - start);

    const { count: usersCount } = await db
      .from('user_tenants')
      .select('*', { count: 'exact', head: true });

    // Documentos/Ventas emitidas hoy en UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: docsCount } = await db
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    return {
      success: true,
      data: {
        status: tErr ? 'degraded' : 'healthy',
        latencyMs,
        tenantsCount: tenantsCount || 0,
        usersCount: usersCount || 0,
        todayDocsCount: docsCount || 0,
        timestamp: new Date().toISOString()
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Consulta TODOS los usuarios del sistema global, cruzando Auth con user_tenants y tenants.
 */
export async function getAllUsersGlobalAdminAction(
  actor: ActionActor
): Promise<{ success: boolean; users?: any[]; error?: string }> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, users: [], error: authCheck.error };
    }

    const db = supabaseAdmin;
    const [authListRes, userTenantsRes, tenantsRes] = await Promise.all([
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from('user_tenants').select('id, user_email, tenant_id, role, created_at'),
      db.from('tenants').select('id, name, active_modules')
    ]);

    const userTenants = userTenantsRes.data || [];
    let authUsers = authListRes.data?.users || [];

    if ((!authUsers || authUsers.length === 0) && userTenants.length > 0) {
      authUsers = Array.from(new Set(userTenants.map((ut: any) => ut.user_email))).map(email => ({
        id: email,
        email: email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {}
      })) as any[];
    }

    const tenantsMap = new Map((tenantsRes.data || []).map((t: any) => [t.id, t]));

    const enrichedUsers = authUsers.map((u: any) => {
      const email = u.email?.toLowerCase();
      const memberships = userTenants.filter(
        (ut: any) => ut.user_email?.toLowerCase() === email
      ).map((ut: any) => ({
        user_tenant_id: ut.id,
        tenant_id: ut.tenant_id,
        tenant_name: tenantsMap.get(ut.tenant_id)?.name || 'Empresa Desconocida',
        role: ut.role,
        tenant_modules: tenantsMap.get(ut.tenant_id)?.active_modules || []
      }));

      const primaryTenant = memberships[0] || null;
      const isSuper = isSuperAdminEmail(email) || u.app_metadata?.role === 'superadmin' || u.app_metadata?.is_superadmin === true;
      const primaryRole = isSuper ? 'superadmin' : (primaryTenant?.role || u.app_metadata?.role || 'seller');

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        is_banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        app_metadata: u.app_metadata || {},
        user_metadata: u.user_metadata || {},
        primary_role: primaryRole,
        primary_tenant_id: primaryTenant?.tenant_id || null,
        primary_tenant_name: primaryTenant?.tenant_name || null,
        allowed_modules: u.app_metadata?.allowed_modules || primaryTenant?.tenant_modules || null,
        memberships
      };
    });

    return { success: true, users: enrichedUsers };
  } catch (err: any) {
    return { success: false, users: [], error: err.message };
  }
}

/**
 * Modifica rol, empresa y módulos permitidos de un usuario en Supabase Auth y user_tenants.
 */
export async function updateUserRoleAndPermissionsAdminAction(
  payload: {
    userId: string;
    userEmail: string;
    newRole: UserRole;
    tenantId?: string;
    allowedModules?: string[];
    isBanned?: boolean;
  },
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const { userId, userEmail, newRole, tenantId, allowedModules, isBanned } = payload;
    const cleanEmail = userEmail.trim().toLowerCase();
    const db = supabaseAdmin;

    // 1. Actualizar metadata y estado de baneo en Supabase Auth
    const authUpdates: any = {
      app_metadata: {
        role: newRole,
        is_superadmin: newRole === 'superadmin',
        allowed_modules: allowedModules || undefined
      },
      user_metadata: {
        role: newRole,
      }
    };

    if (isBanned !== undefined) {
      authUpdates.ban_duration = isBanned ? '876000h' : 'none';
    }

    const { error: authError } = await db.auth.admin.updateUserById(userId, authUpdates);
    if (authError) throw authError;

    // 2. Si se especificó tenantId, actualizar o insertar en user_tenants
    if (tenantId) {
      const { data: existingLink } = await db
        .from('user_tenants')
        .select('id')
        .ilike('user_email', cleanEmail)
        .limit(1);

      if (existingLink && existingLink.length > 0) {
        await db
          .from('user_tenants')
          .update({
            tenant_id: tenantId,
            role: newRole,
            user_email: cleanEmail
          })
          .eq('id', existingLink[0].id);
      } else {
        await db
          .from('user_tenants')
          .insert([{
            tenant_id: tenantId,
            role: newRole,
            user_email: cleanEmail
          }]);
      }
    }

    await writeAuditLog({
      tenant_id: tenantId || 'SYSTEM',
      actor_email: actor.email,
      actor_role: 'superadmin',
      action: 'user.permissions_updated',
      target_type: 'user',
      target_id: userId,
      metadata: { newRole, tenantId, allowedModules, isBanned }
    });

    revalidatePath('/admin');
    revalidatePath('/admin/users');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Crea un nuevo usuario en Supabase Auth y lo vincula a un tenant con rol y módulos.
 */
export async function createGlobalUserAdminAction(
  payload: {
    email: string;
    password: string;
    role: UserRole;
    tenantId: string;
    allowedModules?: string[];
  },
  actor: ActionActor
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const { email, password, role, tenantId, allowedModules } = payload;
    if (!email || !password || password.length < 6) {
      return { success: false, error: 'Correo y contraseña de al menos 6 caracteres requeridos.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = supabaseAdmin;

    // 1. Crear en Supabase Auth
    const { data: createdAuth, error: createError } = await db.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      app_metadata: {
        role,
        is_superadmin: role === 'superadmin',
        allowed_modules: allowedModules || undefined
      },
      user_metadata: {
        role,
        email_verified: true
      }
    });

    if (createError) throw createError;
    const newUserId = createdAuth.user.id;

    // 2. Vincular a user_tenants si hay tenantId
    if (tenantId) {
      await db.from('user_tenants').insert([{
        user_email: cleanEmail,
        tenant_id: tenantId,
        role: role
      }]);
    }

    await writeAuditLog({
      tenant_id: tenantId || 'SYSTEM',
      actor_email: actor.email,
      actor_role: 'superadmin',
      action: 'user.created_by_admin',
      target_type: 'user',
      target_id: newUserId,
      metadata: { cleanEmail, role, tenantId }
    });

    revalidatePath('/admin');
    revalidatePath('/admin/users');

    return { success: true, user: createdAuth.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Elimina permanentemente a un usuario de Supabase Auth y desvincula sus tenants.
 */
export async function deleteUserGlobalAdminAction(
  userId: string,
  userEmail: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await verifySuperAdminActor(actor);
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const db = supabaseAdmin;
    const cleanEmail = userEmail.trim().toLowerCase();

    // 1. Borrar enlaces en user_tenants
    await db.from('user_tenants').delete().ilike('user_email', cleanEmail);

    // 2. Borrar cuenta en Auth
    const { error: authErr } = await db.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    revalidatePath('/admin');
    revalidatePath('/admin/users');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
