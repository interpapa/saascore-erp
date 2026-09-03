import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from '@/lib/rbac';

export interface Tenant {
  id: string;
  name: string;
  blocked: boolean;
  active_modules?: string[];
  metadata?: any;
}

export interface SessionData {
  userEmail: string;
  role: UserRole;
  tenantId: string;
}

interface ERPState {
  session: SessionData | null;
  currentTenant: Tenant | null;
  hasHydrated: boolean;
  
  setSession: (session: SessionData | null) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useERPStore = create<ERPState>()(
  persist(
    (set) => ({
      session: null,
      currentTenant: null,
      hasHydrated: false,
      
      setSession: (session) => set({ session }),
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'saascore-erp-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
