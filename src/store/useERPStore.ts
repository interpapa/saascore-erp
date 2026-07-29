import { create } from 'zustand';
import { UserRole } from '@/lib/rbac';

// ═══════════════════════════════════════════════════
//  INTERFACES DE DATOS (El Modelo de Negocio)
// ═══════════════════════════════════════════════════

export interface JournalEntry {
  id: string;
  date: string;
  account: string; // Ej: 'CAJA', 'CUENTAS_POR_COBRAR', 'INVENTARIO'
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  referenceId: string; // A qué ticket o venta pertenece
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  debt: number;
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  cost: number;
}

export interface Tenant {
  id: string;
  businessName: string;
  blocked: boolean;
}

export interface SessionData {
  userEmail: string;
  role: UserRole;
  tenantId: string; // Si es null, está en modo SuperAdmin
}

// ═══════════════════════════════════════════════════
//  EL STORE (Memoria del ERP)
// ═══════════════════════════════════════════════════

interface ERPState {
  // Estado
  session: SessionData | null;
  currentTenant: Tenant | null;
  clients: Client[];
  products: Product[];
  journal: JournalEntry[];
  
  // Acciones (Mutaciones Seguras)
  loginAs: (role: UserRole, tenantId: string) => void;
  processSale: (clientId: string, productId: string, qty: number, isCredit: boolean) => void;
}

export const useERPStore = create<ERPState>((set, get) => ({
  session: { userEmail: 'admin@saascore.com', role: 'superadmin', tenantId: 'TALLER-001' },
  
  currentTenant: { id: 'TALLER-001', businessName: 'Taller Central S.A.', blocked: false },
  
  clients: [
    { id: 'C1', name: 'Juan Pérez', phone: '123456', debt: 0 }
  ],
  
  products: [
    { id: 'P1', name: 'Aceite Sintético 5W30', stock: 10, price: 50, cost: 30 }
  ],
  
  journal: [],

  // ── LOGICA DE NEGOCIO (Actions) ───────────────────────

  loginAs: (role, tenantId) => set({ session: { userEmail: 'test@test.com', role, tenantId } }),

  // Ejemplo de Lógica Compleja: Procesar Venta (Afecta Kardex y Partida Doble)
  processSale: (clientId, productId, qty, isCredit) => {
    const { products, clients, journal } = get();
    
    const product = products.find(p => p.id === productId);
    const client = clients.find(c => p.id === clientId);
    if (!product || product.stock < qty) throw new Error("Stock insuficiente");

    const totalSale = product.price * qty;
    const totalCost = product.cost * qty;
    const refId = `SALE-${Date.now()}`;
    const date = new Date().toISOString();

    const newEntries: JournalEntry[] = [];

    // 1. Descontar Inventario (Kardex)
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, stock: p.stock - qty } : p
    );

    // 2. Registrar Costo de Ventas (Contabilidad)
    newEntries.push({ id: `J1-${Date.now()}`, date, account: 'INVENTARIO', type: 'CREDIT', amount: totalCost, referenceId: refId });
    newEntries.push({ id: `J2-${Date.now()}`, date, account: 'COSTO_VENTA', type: 'DEBIT', amount: totalCost, referenceId: refId });

    // 3. Registrar Ingreso (Caja o Crédito)
    newEntries.push({ id: `J3-${Date.now()}`, date, account: 'INGRESO_VENTAS', type: 'CREDIT', amount: totalSale, referenceId: refId });
    
    let updatedClients = clients;
    if (isCredit) {
      newEntries.push({ id: `J4-${Date.now()}`, date, account: 'CUENTAS_POR_COBRAR', type: 'DEBIT', amount: totalSale, referenceId: refId });
      // Aumentar deuda del cliente
      updatedClients = clients.map(c => 
        c.id === clientId ? { ...c, debt: c.debt + totalSale } : c
      );
    } else {
      newEntries.push({ id: `J4-${Date.now()}`, date, account: 'CAJA', type: 'DEBIT', amount: totalSale, referenceId: refId });
    }

    set({ 
      products: updatedProducts,
      clients: updatedClients,
      journal: [...journal, ...newEntries]
    });
  }
}));
