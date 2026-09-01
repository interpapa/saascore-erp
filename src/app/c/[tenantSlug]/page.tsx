import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import CatalogClient from './catalog-client';

export const revalidate = 0;

export default async function CatalogPage(props: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await props.params;

  let activeTenant = { id: '00000000-0000-0000-0000-000000000001', name: 'Catálogo Demo', metadata: {} };
  let itemsArr: unknown[] = [];

  try {
    let tenantQuery = supabaseAdmin.from('tenants').select('*');
    
    if (tenantSlug && tenantSlug !== 'demo') {
      tenantQuery = tenantQuery.eq('metadata->>slug', tenantSlug);
    } else {
      tenantQuery = tenantQuery.eq('id', '00000000-0000-0000-0000-000000000001');
    }

    const { data: tenantData } = await tenantQuery.single();
    if (tenantData) {
      activeTenant = tenantData;
    }

    const { data: items } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('tenant_id', activeTenant.id)
      .eq('is_active', true);
      
    if (items) {
      itemsArr = items;
    }
  } catch (err) {
    console.error('Error rendering public catalog:', err);
  }

  return <CatalogClient tenant={activeTenant} items={itemsArr} />;
}
