import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from '@/lib/rbac';

export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  blocked: boolean;
  active_modules?: string[];
  metadata?: Record<string, unknown>;
}

export interface SessionData {
  userEmail: string;
  role: UserRole;
  tenantId: string;
  token?: string;
  expiresAt?: number;
}

export function isSessionExpired(session: SessionData | null): boolean {
  if (!session) return true;
  if (!session.expiresAt) return false;
  return Date.now() > session.expiresAt;
}

interface ERPState {
  session: SessionData | null;
  currentTenant: Tenant | null;
  hasHydrated: boolean;
  impersonatedTenant: Tenant | null;
  originalTenant: Tenant | null;
  
  setSession: (session: SessionData | null) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
  setHasHydrated: (state: boolean) => void;
  impersonateTenant: (tenant: Tenant) => void;
  stopImpersonation: () => void;
}

export const useERPStore = create<ERPState>()(
  persist(
    (set) => ({
      session: null,
      currentTenant: null,
      hasHydrated: false,
      impersonatedTenant: null,
      originalTenant: null,
      
      setSession: (session) => set({ session }),
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      
      impersonateTenant: (tenant: Tenant) => set((state) => ({
        originalTenant: state.originalTenant || state.currentTenant,
        impersonatedTenant: tenant,
        currentTenant: tenant,
        session: state.session ? { ...state.session, tenantId: tenant.id } : null,
      })),

      stopImpersonation: () => set((state) => ({
        currentTenant: state.originalTenant,
        session: state.session && state.originalTenant 
          ? { ...state.session, tenantId: state.originalTenant.id }
          : state.session,
        impersonatedTenant: null,
        originalTenant: null,
      })),
    }),
    {
      name: 'Rendo-erp-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.session && isSessionExpired(state.session)) {
          state.setSession(null);
        }
      },
    }
  )
);
