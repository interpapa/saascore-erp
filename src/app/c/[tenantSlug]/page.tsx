import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import CatalogClient from './catalog-client';

export const revalidate = 0;

export default async function CatalogPage(props: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await props.params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantSlug);

  let tenantQuery = supabaseAdmin.from('tenants').select('*');
  
  if (isUuid) {
    tenantQuery = tenantQuery.eq('id', tenantSlug);
  } else {
    // The instructions say "Resolves tenant by slug or id from Supabase tenants table"
    // so we query by the 'slug' column here.
    tenantQuery = tenantQuery.eq('slug', tenantSlug);
  }

  const { data: tenantData, error: tenantError } = await tenantQuery.single();

  if (tenantError || !tenantData) {
    console.error('Tenant fetch error:', tenantError);
    return notFound();
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('items')
    .select('*')
    .eq('tenant_id', tenantData.id)
    .eq('is_active', true);

  if (itemsError) {
    console.error('Items fetch error:', itemsError);
  }

  return (
    <CatalogClient 
      tenant={tenantData} 
      items={items || []} 
    />
  );
}
