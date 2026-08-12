import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from '@/lib/rbac';

export interface Tenant {
  id: string;
  name: string;
  blocked: boolean;
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
  
  setSession: (session: SessionData | null) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
}

export const useERPStore = create<ERPState>()(
  persist(
    (set) => ({
      session: null,
      currentTenant: null,
      
      setSession: (session) => set({ session }),
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
    }),
    {
      name: 'saascore-erp-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
