'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createTenant(userId: string, userEmail: string, businessName: string) {
  try {
    const db = supabaseAdmin || supabase;

    // 1. Crear el Tenant con permisos de servidor
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert([
        {
          name: businessName,
          is_active: true,
          currency: 'USD',
          symbol: '$',
          country_code: 'VE',
        }
      ])
      .select()
      .single();

    if (tenantError) throw new Error('Error al crear la empresa: ' + tenantError.message);

    // 2. Vincular el Usuario con el Tenant en user_tenants
    const { error: linkError } = await db
      .from('user_tenants')
      .insert([
        {
          user_email: userEmail,
          tenant_id: tenant.id,
          role: 'owner'
        }
      ]);

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

export async function updateTenantSettings(tenantId: string, name: string, metadata: any) {
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllTenants() {
  try {
    const db = supabaseAdmin || supabase;
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

export async function toggleTenantStatus(tenantId: string, newStatus: 'active' | 'suspended') {
  try {
    const db = supabaseAdmin || supabase;
    const is_active = newStatus === 'active';
    const { error } = await db
      .from('tenants')
      .update({ is_active })
      .eq('id', tenantId);

    revalidatePath('/admin');
    revalidatePath('/admin/billing');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserTenant(userEmail: string) {
  try {
    const db = supabaseAdmin || supabase;

    // 1. Buscar relación user_tenants por email
    const { data: userTenant, error: utError } = await db
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_email', userEmail)
      .maybeSingle();

    if (utError || !userTenant) {
      return { success: false, tenant: null, role: null };
    }

    // 2. Buscar datos del tenant
    const { data: tenant, error: tError } = await db
      .from('tenants')
      .select('*')
      .eq('id', userTenant.tenant_id)
      .maybeSingle();

    if (tError || !tenant) {
      return { success: false, tenant: null, role: null };
    }

    return {
      success: true,
      tenant,
      role: userTenant.role
    };
  } catch (error: any) {
    return { success: false, tenant: null, role: null, error: error.message };
  }
}
