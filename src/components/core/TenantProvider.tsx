'use client';

import { createContext, useContext } from 'react';
import { useERPStore } from '@/store/useERPStore';

interface TenantContextType {
  activeTenant: { id: string; name: string; blocked: boolean } | null;
  isLoadingTenant: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  // Lee directamente del store de Zustand (fuente de verdad unificada)
  const { currentTenant } = useERPStore();

  return (
    <TenantContext.Provider value={{ activeTenant: currentTenant, isLoadingTenant: false }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
