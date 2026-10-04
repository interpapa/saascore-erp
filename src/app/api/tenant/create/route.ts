import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_ENABLED_MODULES } from '@/lib/core/kernel/moduleRegistry';
import { writeAuditLog } from '@/lib/core/auditLogger';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userEmail, businessName } = body as {
      userId?: string;
      userEmail?: string;
      businessName?: string;
    };

    const cleanName = (businessName || '').trim();
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la empresa debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    if (!cleanEmail && !userId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere la sesión o correo del usuario para registrar la empresa.' },
        { status: 400 }
      );
    }

    const db = supabaseAdmin;

    // 0. Idempotencia: Verificar si el usuario ya tiene una empresa vinculada previamente
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
        return NextResponse.json({ success: true, tenant: existingTenant });
      }
    }

    // 1. Crear el Tenant con permisos completos
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
      return NextResponse.json(
        { success: false, error: 'Error al registrar la empresa: ' + (tenantError?.message || 'Error desconocido') },
        { status: 500 }
      );
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
      const fallbackLink = cleanEmail 
        ? { user_email: cleanEmail, tenant_id: tenant.id, role: 'owner' } 
        : { user_id: userId, tenant_id: tenant.id, role: 'owner' };
      const retryLink = await db.from('user_tenants').insert([fallbackLink]);
      linkError = retryLink.error;
    }

    if (linkError) {
      await db.from('tenants').delete().eq('id', tenant.id);
      return NextResponse.json(
        { success: false, error: 'Error al vincular el usuario con la empresa: ' + linkError.message },
        { status: 500 }
      );
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

    return NextResponse.json({ success: true, tenant });
  } catch (err: any) {
    console.error('[/api/tenant/create Error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
