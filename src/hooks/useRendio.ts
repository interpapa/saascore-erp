'use client';

import { useMemo } from 'react';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from './useActionActor';
import { rendio } from '@/lib/api/rendioRegistry';

/**
 * Hook universal de consumo de la API de Rendo ERP.
 * 
 * Inyecta automáticamente el `tenantId` actual y el `actor` verificado,
 * evitando que los componentes de React tengan que gestionar manualmente
 * credenciales o lidiar con parámetros repetitivos en cada Server Action.
 * 
 * @example
 * ```tsx
 * const api = useRendio();
 * 
 * // Autocompletado 100% tipado y sin pasar tenantId ni actor manualmente:
 * const res = await api.catalogo.createItem({ name: 'Corte Clásico', base_price: 15, cost: 0, type: 'service' });
 * if (!res.success) toast.error(res.error);
 * ```
 */
export function useRendio() {
  const currentTenant = useERPStore((s) => s.currentTenant);
  const actor = useActionActor();
  const tenantId = currentTenant?.id;

  return useMemo(() => {
    const hasContext = Boolean(tenantId && actor);

    return {
      hasContext,
      tenantId,
      actor,

      catalogo: {
        getItems: (type?: 'product' | 'service' | 'subscription', limit?: number) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, items: [], error: 'Sesión o empresa no disponible.' });
          return rendio.catalogo.getItems(tenantId, actor, type, limit);
        },
        createItem: (input: Parameters<typeof rendio.catalogo.createItem>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.catalogo.createItem(input, tenantId, actor);
        },
        updateItem: (id: string, updates: Parameters<typeof rendio.catalogo.updateItem>[1]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.catalogo.updateItem(id, updates, tenantId, actor);
        },
        deleteItem: (id: string) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.catalogo.deleteItem(id, tenantId, actor);
        },
        adjustStock: (id: string, delta: number) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.catalogo.adjustStock(id, delta, tenantId, actor);
        },
        archiveItem: (input: Parameters<typeof rendio.catalogo.archiveItem>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.catalogo.archiveItem(input, tenantId, actor);
        },
        bulkImport: (items: Parameters<typeof rendio.catalogo.bulkImport>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.catalogo.bulkImport(items, tenantId, actor);
        },
      },

      calendario: {
        getAppointments: (filter?: Parameters<typeof rendio.calendario.getAppointments>[1]) => {
          if (!tenantId) return Promise.resolve({ success: false, appointments: [], error: 'Empresa no seleccionada.' });
          return rendio.calendario.getAppointments(tenantId, filter, actor || undefined);
        },
        createAppointment: (input: Parameters<typeof rendio.calendario.createAppointment>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.calendario.createAppointment(input, tenantId, actor);
        },
        updateStatus: (id: string, status: Parameters<typeof rendio.calendario.updateStatus>[1]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.calendario.updateStatus(id, status, tenantId, actor);
        },
        updatePaymentStatus: (id: string, paymentStatus: 'paid' | 'pending' | 'unrecorded') => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.calendario.updatePaymentStatus(id, paymentStatus, tenantId, actor);
        },
        getBookedTimes: (employeeId: string, date: string) => {
          if (!tenantId) return Promise.resolve({ success: false, bookedTimes: [] });
          return rendio.calendario.getBookedTimes(tenantId, employeeId, date);
        },
        processPublicBooking: rendio.calendario.processPublicBooking,
      },

      caja: {
        getSessionStatus: () => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.caja.getSessionStatus(tenantId, actor);
        },
        openSession: (initialAmount: number) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.caja.openSession(initialAmount, tenantId, actor);
        },
        closeSession: (sessionId: string, countedCash: number, notes: string) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.caja.closeSession(sessionId, countedCash, notes, tenantId, actor);
        },
        checkout: (
          cartItems: Parameters<typeof rendio.caja.checkout>[0],
          entityId: string | null = '',
          paymentMethod: Parameters<typeof rendio.caja.checkout>[2] = 'cash',
          localizationCode?: 'VE' | 'US' | 'ES' | 'CO',
          idempotencyKey?: string,
          chargeTaxes?: boolean,
          paymentBreakdown?: Parameters<typeof rendio.caja.checkout>[8]
        ) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.caja.checkout(
            cartItems,
            entityId || '',
            paymentMethod,
            tenantId,
            actor,
            localizationCode,
            idempotencyKey,
            chargeTaxes,
            paymentBreakdown
          );
        },
      },

      clientes: {
        getEntities: (type?: Parameters<typeof rendio.clientes.getEntities>[2], limit?: number) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, entities: [], error: 'Sesión o empresa no disponible.' });
          return rendio.clientes.getEntities(tenantId, actor, type, limit);
        },
        createEntity: (input: Parameters<typeof rendio.clientes.createEntity>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.clientes.createEntity(input, tenantId, actor);
        },
        updateEntity: (id: string, updates: Parameters<typeof rendio.clientes.updateEntity>[1]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.clientes.updateEntity(id, updates, tenantId, actor);
        },
        deleteEntity: (id: string) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.clientes.deleteEntity(id, tenantId, actor);
        },
      },

      equipo: {
        getAttendanceLogs: () => {
          if (!tenantId) return Promise.resolve({ success: false, logs: [], error: 'Empresa no seleccionada.' });
          return rendio.equipo.getAttendanceLogs(tenantId, actor || undefined);
        },
        registerAttendance: (payload: Parameters<typeof rendio.equipo.registerAttendance>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.equipo.registerAttendance(payload, tenantId, actor);
        },
        processPayrollDisbursement: (periodName: string, employees: any[]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.equipo.processPayrollDisbursement(periodName, employees, tenantId, actor);
        },
      },

      whatsapp: {
        getConversations: (filter?: Parameters<typeof rendio.whatsapp.getConversations>[1]) => {
          if (!tenantId) return Promise.resolve({ success: false, conversations: [], error: 'Empresa no seleccionada.' });
          return rendio.whatsapp.getConversations(tenantId, filter, actor || undefined);
        },
        getMessages: (conversationId: string) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, messages: [], error: 'Sesión no disponible.' });
          return rendio.whatsapp.getMessages(conversationId, tenantId, actor);
        },
        sendMessage: (input: Parameters<typeof rendio.whatsapp.sendMessage>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.whatsapp.sendMessage(input, tenantId, actor);
        },
      },

      contabilidad: {
        getTrialBalance: (filter?: Parameters<typeof rendio.contabilidad.getTrialBalance>[2]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.contabilidad.getTrialBalance(tenantId, actor, filter);
        },
        getJournalEntries: (filter?: Parameters<typeof rendio.contabilidad.getJournalEntries>[2]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.contabilidad.getJournalEntries(tenantId, actor, filter);
        },
        getIncomeStatement: (filter?: Parameters<typeof rendio.contabilidad.getIncomeStatement>[2]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.contabilidad.getIncomeStatement(tenantId, actor, filter);
        },
        createJournalEntry: (payload: Parameters<typeof rendio.contabilidad.createJournalEntry>[0]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.contabilidad.createJournalEntry(payload, tenantId, actor);
        },
      },

      configuracion: {
        updateSettings: (name: string, metadata: unknown, activeModules?: string[]) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.configuracion.updateSettings(tenantId, name, metadata, activeModules, actor);
        },
        createUser: (userEmail: string, temporaryPassword: string, role: any) => {
          if (!tenantId || !actor) return Promise.resolve({ success: false, error: 'Sesión no disponible.' });
          return rendio.configuracion.createUser(tenantId, userEmail, temporaryPassword, role, actor);
        },
      },

      /** Acceso directo a la fachada sin enlazar para llamadas con parámetros personalizados */
      raw: rendio,
    };
  }, [tenantId, actor]);
}
