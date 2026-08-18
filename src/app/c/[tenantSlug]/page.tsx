import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import CatalogClient from './catalog-client';

export const revalidate = 0;

export default async function CatalogPage(props: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await props.params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantSlug);

    let tenantQuery = supabaseAdmin.from('tenants').select('*');
    
    if (isUuid) {
      tenantQuery = tenantQuery.eq('id', tenantSlug);
    } else {
      tenantQuery = tenantQuery.eq('id', '00000000-0000-0000-0000-000000000001');
    }

    const { data: tenantData } = await tenantQuery.single();

    const activeTenant = tenantData || {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Catálogo Demo',
      metadata: {}
    };

    const { data: items } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('tenant_id', activeTenant.id)
      .eq('is_active', true);

    return (
      <CatalogClient 
        tenant={activeTenant} 
        items={items || []} 
      />
    );
  } catch (err) {
    console.error('Error rendering public catalog:', err);
    return (
      <CatalogClient 
        tenant={{ id: '00000000-0000-0000-0000-000000000001', name: 'Catálogo Demo', metadata: {} }} 
        items={[]} 
      />
    );
  }
}
