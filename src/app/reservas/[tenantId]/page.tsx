import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import BookingClient from '@/components/reservas/BookingClient';

export const dynamic = 'force-dynamic';

import { normalizeHexColor } from '@/lib/theme/colorUtils';

export default async function ReservasPublicPage({ params }: { params: Promise<{ tenantId: string }> | { tenantId: string } }) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const { tenantId } = resolvedParams;

  if (!tenantId) {
    return (
      <div className="p-10 bg-red-50 text-red-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Error de Depuración</h1>
        <p>tenantId is undefined</p>
      </div>
    );
  }

  // 1. Fetch Tenant (Soporta UUID directo o Slug / Nombre de consultorio)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
  let tenantQuery = supabaseAdmin
    .from('tenants')
    .select('id, name, metadata');
    
  if (isUuid) {
    tenantQuery = tenantQuery.eq('id', tenantId);
  } else {
    const cleanSlug = decodeURIComponent(tenantId).trim();
    const cleanWithSpaces = cleanSlug.replace(/-/g, ' ');
    const cleanWithDashes = cleanSlug.replace(/\s+/g, '-');
    tenantQuery = tenantQuery.or(
      `metadata->>slug.eq.${cleanSlug},metadata->>slug.eq.${cleanWithDashes},name.ilike.%${cleanSlug}%,name.ilike.%${cleanWithSpaces}%`
    );
  }

  let { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();

  // Si no se encuentra por slug exacto, intentar búsqueda por palabras clave en nombre de empresa
  if (!tenant && !isUuid) {
    const cleanSlug = decodeURIComponent(tenantId).trim();
    const { data: fallbackTenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, metadata')
      .ilike('name', `%${cleanSlug.replace(/[^a-zA-Z0-9]/g, '%')}%`)
      .limit(1);
    if (fallbackTenants && fallbackTenants.length > 0) {
      tenant = fallbackTenants[0];
      tenantError = null;
    }
  }

  if (tenantError || !tenant) {
    return (
      <div className="p-10 bg-red-50 text-red-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Empresa / Consultorio no encontrado</h1>
        <p><strong>Identificador buscado:</strong> {tenantId}</p>
        <p><strong>Error de Supabase:</strong> {tenantError?.message || 'No se encontró ninguna empresa con este enlace.'}</p>
      </div>
    );
  }

  // 2. Fetch Employees usando el ID real del tenant (tolerante a estado activo o null)
  const { data: employeesData } = await supabaseAdmin
    .from('entities')
    .select('id, name, metadata, status, role')
    .eq('tenant_id', tenant.id)
    .in('type', ['employee', 'doctor', 'staff'])
    .is('deleted_at', null);

  const employees = (employeesData || [])
    .filter(e => {
      // 1. Excluir únicamente si está marcado explícitamente como inactivo
      if (e.status === 'inactive' || e.status === 'deleted') return false;
      if (e.metadata?.bookable === false) return false;

      // 2. Blindaje anti-contaminación: descartar entidades dummy de pruebas automatizadas (QA)
      const name = (e.name || '').trim();
      if (/^(Colaborador|Especialista|Usuario|Doctor)\s+QA\b/i.test(name)) return false;

      // 3. Filtrar recursos físicos sin servicios configurados
      const isPhysicalResource = e.metadata?.is_resource === true || e.metadata?.role_title === 'Espacio / Recurso';
      const svcs = Array.isArray(e.metadata?.services) ? e.metadata.services : [];
      if (isPhysicalResource && svcs.length === 0) return false;

      return true;
    })
    .map(e => ({
      id: e.id,
      name: e.name,
      role: e.metadata?.role_title || e.metadata?.doctor_config?.specialty || e.metadata?.doctor_config?.role || e.metadata?.specialty || e.metadata?.dentist_config?.role || e.metadata?.role || (e as any).role || e.metadata?.cargo || 'Especialista',
      is_active: e.status !== 'inactive',
      metadata: e.metadata
    }));

  // 3. Fetch Catalog Services (de la tabla items para servicios y procedimientos registrados en el Catálogo)
  let catalogServices: any[] = [];
  try {
    const { data: catalogItems } = await supabaseAdmin
      .from('items')
      .select('id, name, description, category, base_price, metadata')
      .eq('tenant_id', tenant.id)
      .eq('type', 'service')
      .neq('is_active', false)
      .is('deleted_at', null);
    if (catalogItems) catalogServices = catalogItems;
  } catch (itemErr) {
    console.warn('[Reservas] Error fetching catalog items (non-blocking):', itemErr);
  }

  const publicTheme = tenant.metadata?.public_theme || {};
  const theme = {
    bgColor: normalizeHexColor(publicTheme.bgColor, "#f8fafc"),
    btnColor: normalizeHexColor(publicTheme.btnColor, "#0B3B24"),
  };
  return <BookingClient tenant={tenant} employees={employees} catalogServices={catalogServices} theme={theme} />;
}
