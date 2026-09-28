'use client';

import { useERPStore, Tenant } from '@/store/useERPStore';

/**
 * Hook to resolve the active tenant cleanly and safely.
 * Returns the currentTenant if hydrated, or a fallback reconstructed from session.tenantId.
 * Returns null if no valid tenant ID is known yet, preventing accidental queries
 * to invalid or fake demo UUIDs that cause false empty states.
 */
export function useTenantResolver(): Tenant | null {
  const currentTenant = useERPStore(s => s.currentTenant);
  const session = useERPStore(s => s.session);

  if (currentTenant?.id) {
    return currentTenant;
  }

  // Fallback seguro: si currentTenant aún se está hidratando pero session.tenantId ya está disponible
  if (session?.tenantId) {
    return {
      id: session.tenantId,
      name: currentTenant?.name || 'Mi Empresa',
      blocked: false,
      active_modules: currentTenant?.active_modules || [],
      metadata: currentTenant?.metadata || {},
    };
  }

  return null;
}
