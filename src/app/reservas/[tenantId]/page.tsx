import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import BookingClient from '@/components/reservas/BookingClient';

export default async function ReservasPublicPage({ params }: { params: { tenantId: string } }) {
  const { tenantId } = params;

  if (!tenantId) {
    return notFound();
  }

  // 1. Fetch Tenant Name
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single();

  if (!tenant) {
    return notFound();
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
