'use client';

import { useEffect } from 'react';
import { useERPStore, Tenant } from '@/store/useERPStore';
import { supabase } from '@/lib/supabase';

const DEFAULT_DEMO_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Empresa Principal (Demo)',
  blocked: false,
  metadata: {},
};

export function useTenantResolver() {
  const { currentTenant, setCurrentTenant } = useERPStore();

  useEffect(() => {
    async function resolveTenant() {
      // Si ya hay un tenant cargado en Zustand, no volver a consultar
      if (currentTenant) return;

      try {
        // Intentar consultar por is_active (columna real en PostgreSQL)
        const { data: tenants, error } = await supabase
          .from('tenants')
          .select('*')
          .limit(1);

        if (!error && tenants && tenants.length > 0) {
          const tenant = tenants[0];
          setCurrentTenant({
            id: tenant.id,
            name: tenant.name,
            blocked: tenant.is_active === false,
            metadata: tenant.metadata || {},
          });
          return;
        }
      } catch (err) {
        console.warn('[TenantResolver] Fallback a tenant por defecto:', err);
      }

      // Fallback instantáneo sin demoras para que las páginas carguen de inmediato
      setCurrentTenant(DEFAULT_DEMO_TENANT);
    }

    resolveTenant();
  }, [currentTenant, setCurrentTenant]);

  return currentTenant || DEFAULT_DEMO_TENANT;
}
