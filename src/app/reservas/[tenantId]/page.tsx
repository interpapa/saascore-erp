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
    tenantQuery = tenantQuery.or(`metadata->>slug.eq.${tenantId},name.ilike.${tenantId}`);
  }

  const { data: tenant, error: tenantError } = await tenantQuery.maybeSingle();

  if (tenantError || !tenant) {
    return (
      <div className="p-10 bg-red-50 text-red-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Empresa / Consultorio no encontrado</h1>
        <p><strong>Identificador buscado:</strong> {tenantId}</p>
        <p><strong>Error de Supabase:</strong> {tenantError?.message || 'No se encontró ninguna empresa con este enlace.'}</p>
      </div>
    );
  }

  // 2. Fetch Employees usando el ID real del tenant
  const { data: employeesData } = await supabaseAdmin
    .from('entities')
    .select('id, name, metadata, status, role')
    .eq('tenant_id', tenant.id)
    .eq('type', 'employee')
    .eq('status', 'active');

  const employees = (employeesData || [])
    .filter(e => {
      // 1. Si el registro está explícitamente excluido de reservas públicas
      if (e.metadata?.bookable === false) return false;

      // 2. Blindaje anti-contaminación: descartar entidades dummy de pruebas automatizadas (QA)
      const name = (e.name || '').trim();
      if (/^(Colaborador|Especialista|Usuario|Doctor)\s+QA\b/i.test(name)) return false;

      // 3. Filtrar recursos físicos (canchas, cabinas, salas) sin servicios configurados
      const isPhysicalResource = e.metadata?.is_resource === true || e.metadata?.role_title === 'Espacio / Recurso';
      const svcs = Array.isArray(e.metadata?.services) ? e.metadata.services : [];
      if (isPhysicalResource && svcs.length === 0) return false;

      // 4. Reconocer rol clínico, especialidad médica o cargo laboral
      const hasClinicalConfig = Boolean(
        e.metadata?.role_title ||
        e.metadata?.doctor_config?.specialty ||
        e.metadata?.doctor_config?.role ||
        e.metadata?.dentist_config?.role ||
        e.metadata?.barber_config?.role ||
        e.metadata?.role ||
        (e as any).role ||
        e.metadata?.cargo ||
        e.metadata?.position ||
        e.metadata?.specialty ||
        e.metadata?.specialization
      );
      const isExplicitlyBookable = e.metadata?.bookable === true;
      const hasServices = svcs.length > 0;

      // Si no es recurso físico y está activo sin exclusión explícita, se incluye
      if (isPhysicalResource && !hasServices) {
        return false;
      }

      return isExplicitlyBookable || hasServices || hasClinicalConfig || true;
    })
    .map(e => ({
      id: e.id,
      name: e.name,
      role: e.metadata?.role_title || e.metadata?.doctor_config?.specialty || e.metadata?.doctor_config?.role || e.metadata?.dentist_config?.role || e.metadata?.role || (e as any).role || e.metadata?.cargo || 'Especialista',
      is_active: e.status === 'active',
      metadata: e.metadata
    }));

  const publicTheme = tenant.metadata?.public_theme || {};
  const theme = {
    bgColor: normalizeHexColor(publicTheme.bgColor, "#f8fafc"),
    btnColor: normalizeHexColor(publicTheme.btnColor, "#0B3B24"),
  };
  return <BookingClient tenant={tenant} employees={employees} theme={theme} />;
}
