'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createTenant(userId: string, userEmail: string, businessName: string) {
  try {
    const db = supabaseAdmin || supabase;
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
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantSettings(tenantId: string, name: string, metadata: unknown) {
  try {
    const db = supabaseAdmin || supabase;
    const { data: tenant, error } = await db
      .from('tenants')
      .update({
        name,
        metadata
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al actualizar configuración: ' + error.message);

    revalidatePath('/configuracion');
    revalidatePath('/dashboard');
    return { success: true, tenant };
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}

export async function getAllTenants(callerEmail: string) {
  try {
    if (callerEmail?.toLowerCase() !== 'interpapadavid2811@gmail.com') {
      return { success: false, tenants: [], error: 'No autorizado' };
    }
    const db = supabaseAdmin || supabase;
    const { data: tenants, error } = await db
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error('Error fetching tenants: ' + error.message);
    return { success: true, tenants };
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}

export async function toggleTenantStatus(tenantId: string, newStatus: 'active' | 'suspended', callerEmail: string) {
  try {
    if (callerEmail?.toLowerCase() !== 'interpapadavid2811@gmail.com') {
      throw new Error('No autorizado.');
    }
    const db = supabaseAdmin || supabase;
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
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}

export async function getUserTenant(userEmail: string, userId?: string) {
  try {
    const db = supabaseAdmin || supabase;
    const cleanEmail = (userEmail || '').trim();

    if (!cleanEmail) {
      return { success: false, tenant: null, role: null };
    }

    const isSuperAdmin = cleanEmail.toLowerCase() === 'interpapadavid2811@gmail.com';

    // 1. Buscar relación user_tenants por email
    const userTenantsRes = await db
      .from('user_tenants')
      .select('tenant_id, role, created_at')
      .ilike('user_email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(1);

    let userTenants = userTenantsRes.data;
    let utError = userTenantsRes.error;

    if (utError && (utError.message.includes('user_email') || utError.message.includes('column'))) {
      // Fallback: If user_email column is missing (migration_run schema)
      if (userId) {
        // Option A: If we already have the UUID of the user, query by user_id directly
        const retry = await db
          .from('user_tenants')
          .select('tenant_id, role, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        userTenants = retry.data;
        utError = retry.error;
      } else {
        // Option B: If no UUID is passed, list users from Auth API and match by email in memory
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
        const match = (usersList?.users || []).find((u) => u.email?.toLowerCase() === cleanEmail.toLowerCase());
        if (match) {
          const retry = await db
            .from('user_tenants')
            .select('tenant_id, role, created_at')
            .eq('user_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1);
          userTenants = retry.data;
          utError = retry.error;
        }
      }
    }

    if (utError || !userTenants || userTenants.length === 0) {
      if (isSuperAdmin) {
        return { success: true, tenant: null, role: 'superadmin' };
      }
      return { success: false, tenant: null, role: null };
    }

    const userTenant = userTenants[0];

    // 2. Buscar datos del tenant
    const { data: tenant, error: tError } = await db
      .from('tenants')
      .select('*')
      .eq('id', userTenant.tenant_id)
      .maybeSingle();

    if (tError || !tenant) {
      // Si es superadmin pero no tiene tenant, devolver null en tenant pero role superadmin
      if (isSuperAdmin) {
        return { success: true, tenant: null, role: 'superadmin' };
      }
      return { success: false, tenant: null, role: null };
    }

    return {
      success: true,
      tenant,
      role: isSuperAdmin ? 'superadmin' : userTenant.role
    };
  } catch (error: unknown) {
    return { success: false, tenant: null, role: null, error: error.message };
  }
}
