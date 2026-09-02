import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import BookingClient from '@/components/reservas/BookingClient';

export const dynamic = 'force-dynamic';

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

  // 1. Fetch Tenant Name and Metadata
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name, metadata')
    .eq('id', tenantId)
    .single();

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

  // 2. Fetch Barbers (Employees) for this tenant
  const { data: employeesData } = await supabaseAdmin
    .from('entities')
    .select('id, name, metadata, status')
    .eq('tenant_id', tenantId)
    .eq('type', 'employee')
    .eq('status', 'active');

  const employees = (employeesData || []).map(e => ({
    id: e.id,
    name: e.name,
    role: e.metadata?.role || 'Profesional',
    is_active: e.status === 'active'
  }));

  return <BookingClient tenant={tenant} employees={employees} />;
}
