import { create } from 'zustand';
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

const INITIAL_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'SaaSCore Enterprise',
  blocked: false,
  metadata: {},
};

export const useERPStore = create<ERPState>((set) => ({
  session: {
    userEmail: 'admin@saascore.com',
    role: 'owner',
    tenantId: '00000000-0000-0000-0000-000000000001',
  },
  currentTenant: INITIAL_TENANT,
  
  setSession: (session) => set({ session }),
  setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
}));
