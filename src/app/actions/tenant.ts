'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { UserRole } from '@/lib/rbac';
import { validateUserTenantAccess, isSuperAdminEmail, isSuperAdminAuthUser, SUPERADMIN_EMAILS } from '@/lib/core/tenantSecurity';

async function verifySuperAdminActor(
  callerOrActor: ActionActor | string,
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

  // Validación criptográfica obligatoria vía Supabase Auth (Zero-Trust)
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

    // 1. Crear el Tenant con permisos de servidor
    let insertTenant: unknown = {
      name: businessName,
      is_active: true,
      currency: 'USD',
      symbol: '$',
      country_code: 'VE',
    };

    let { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert([insertTenant])
      .select()
      .single();

    if (tenantError && (tenantError.message.includes('is_active') || tenantError.message.includes('column'))) {
      // Fallback: If DB schema doesn't have is_active / currency columns, save them in metadata
      insertTenant = {
        name: businessName,
        status: 'active',
        metadata: {
          is_active: true,
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

    if (tenantError) throw new Error('Error al crear la empresa: ' + tenantError.message);

    // 2. Vincular el Usuario con el Tenant en user_tenants
    let linkData: unknown = {
      user_email: cleanEmail,
      tenant_id: tenant.id,
      role: 'owner'
    };

    let { error: linkError } = await db
      .from('user_tenants')
      .insert([linkData]);

    if (linkError && (linkError.message.includes('user_email') || linkError.message.includes('column'))) {
      // Fallback: If DB schema uses user_id instead of user_email (as in migration_run)
      linkData = {
        user_id: userId,
        tenant_id: tenant.id,
        role: 'owner'
      };
      const retry = await db
        .from('user_tenants')
        .insert([linkData]);
      linkError = retry.error;
    }

    if (linkError) {
      await db.from('tenants').delete().eq('id', tenant.id);
      throw new Error('Error al vincular el usuario con la empresa: ' + linkError.message);
    }

    revalidatePath('/dashboard');
    return { success: true, tenant };
  } catch (error: any) {
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

export async function getAllTenants(callerOrActor: ActionActor | string, token?: string) {
  try {
    const authCheck = await verifySuperAdminActor(callerOrActor, token);
    if (!authCheck.authorized) {
      return { success: false, tenants: [], error: authCheck.error || 'No autorizado. Se requiere acceso de Super Administrador.' };
    }
    const db = supabaseAdmin;
    const { data: tenants, error } = await db
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error('Error fetching tenants: ' + error.message);
    return { success: true, tenants };
  } catch (error: any) {
    return { success: false, error: error.message };
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

    // Si no se encontró por email o hubo error en columna, intentar por user_id
    if ((!userTenants || userTenants.length === 0 || utError) && userId) {
      const retry = await db
        .from('user_tenants')
        .select('tenant_id, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (retry.data && retry.data.length > 0) {
        userTenants = retry.data;
        utError = retry.error;
      }
    }

    if (utError || !userTenants || userTenants.length === 0) {
      if (isSuperAdmin) {
        return { success: true, tenant: null, role: 'superadmin' };
      }
      return { success: false, tenant: null, role: null };
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
      tenant,
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
        user_id: userId,
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
      .select('id, user_id, user_email, role, created_at')
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
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key',
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
      .select('id, user_email, user_id, role, created_at')
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
