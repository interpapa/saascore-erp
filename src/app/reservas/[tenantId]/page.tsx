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

  // 1. Fetch Tenant and Employees in parallel for maximum speed
  const [tenantRes, employeesRes] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, metadata')
      .eq('id', tenantId)
      .single(),
    supabaseAdmin
      .from('entities')
      .select('id, name, metadata, status')
      .eq('tenant_id', tenantId)
      .eq('type', 'employee')
      .eq('status', 'active'),
  ]);

  const tenant = tenantRes.data;
  const tenantError = tenantRes.error;
  const employeesData = employeesRes.data;

  if (tenantError || !tenant) {
    return (
      <div className="p-10 bg-red-50 text-red-900 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Error de Depuración (Solo para el Admin)</h1>
        <p><strong>ID buscado:</strong> {tenantId}</p>
        <p><strong>Error de Supabase:</strong> {tenantError?.message || 'Ningún error, pero devolvió null'}</p>
        <p><strong>Código de error:</strong> {tenantError?.code}</p>
        <p><strong>Detalles:</strong> {tenantError?.details}</p>
      </div>
    );
  }

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

      // 4. Excluir registros huérfanos sin rol, sin servicios y sin configuración explícita
      const hasServices = svcs.length > 0;
      const hasClinicalConfig = Boolean(
        e.metadata?.role_title ||
        e.metadata?.doctor_config?.specialty ||
        e.metadata?.doctor_config?.role ||
        e.metadata?.dentist_config?.role ||
        e.metadata?.barber_config?.role
      );
      const isExplicitlyBookable = e.metadata?.bookable === true;

      if (!isExplicitlyBookable && !hasServices && !hasClinicalConfig) {
        return false;
      }

      return true;
    })
    .map(e => ({
      id: e.id,
      name: e.name,
      role: e.metadata?.role_title || e.metadata?.doctor_config?.specialty || e.metadata?.doctor_config?.role || e.metadata?.dentist_config?.role || e.metadata?.role || 'Profesional',
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
