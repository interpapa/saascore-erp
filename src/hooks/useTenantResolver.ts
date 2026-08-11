'use client';

import { useERPStore, Tenant } from '@/store/useERPStore';

const DEFAULT_DEMO_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Empresa Principal (Demo)',
  blocked: false,
  metadata: {},
};

export function useTenantResolver() {
  const { currentTenant } = useERPStore();
  return currentTenant || DEFAULT_DEMO_TENANT;
}
