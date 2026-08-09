'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createTenant(userId: string, businessName: string) {
  try {
    // 1. Crear el Tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([
        {
          name: businessName,
          status: 'active',
          active_modules: ["caja", "clientes", "catalogo", "tickets"],
          subscription_plan: 'basic'
        }
      ])
      .select()
      .single();

    if (tenantError) throw new Error('Error al crear la empresa: ' + tenantError.message);

    // 2. Vincular el Usuario con el Tenant
    const { error: linkError } = await supabase
      .from('user_tenants')
      .insert([
        {
          user_id: userId,
          tenant_id: tenant.id,
          role: 'owner'
        }
      ]);

    if (linkError) {
      // Rollback (idealmente en una función RPC, pero por ahora lo borramos manualmente)
      await supabase.from('tenants').delete().eq('id', tenant.id);
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
    const { data: tenant, error } = await supabase
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
    const { data: tenants, error } = await supabase
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
    const { error } = await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantId);

    if (error) throw new Error('Error updating status: ' + error.message);
    
    revalidatePath('/admin');
    revalidatePath('/admin/billing');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
