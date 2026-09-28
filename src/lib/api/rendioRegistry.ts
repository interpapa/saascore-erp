/**
 * Rendo Universal API Registry & Facade (Estilo Odoo 17 Services)
 * 
 * Centraliza el acceso a todas las operaciones y Server Actions del ERP
 * organizadas por módulo de negocio.
 */

// Módulo: Catálogo & Inventario
import { 
  createItemAction, 
  updateItemAction, 
  deleteItemAction, 
  getItemsAction,
  adjustItemStockAction,
  archiveItemAction,
  CreateItemActionInput,
  ItemType 
} from '@/app/actions/items';
import { bulkImportItemsAction, BulkImportItem } from '@/app/actions/bulkImport';
import { processInventoryReceiptAction } from '@/app/actions/inventory';

// Módulo: Citas & Calendario
import { 
  createAppointmentAction, 
  updateAppointmentStatusAction, 
  updateAppointmentPaymentStatusAction,
  getAppointmentsAction
} from '@/app/actions/appointments';
import {
  AppointmentStatus,
  CreateAppointmentInput,
  AppointmentFilterState
} from '@/types/calendario';
import { processBookingAction, getBookedTimesAction } from '@/app/actions/booking';

// Módulo: Caja POS
import { 
  openCashSessionAction, 
  closeCashSessionAction, 
  getCashSessionStatusAction 
} from '@/app/actions/cashRegister';
import { processSecureCheckout } from '@/app/actions/checkout';
import { LocalizationCode } from '@/lib/core/taxEngine';

// Módulo: Clientes & CRM
import { 
  getEntitiesAction, 
  createEntityAction, 
  updateEntityAction, 
  deleteEntityAction,
  CreateEntityInput,
  EntityType 
} from '@/app/actions/entities';
import { getCRMPipelineSummaryAction, getMRRMetricsAction } from '@/app/actions/crm';

// Módulo: Personal & Nómina
import { 
  registerAttendanceAction, 
  getAttendanceLogsAction,
  AttendanceInput 
} from '@/app/actions/attendance';
import { processPayrollDisbursementAction } from '@/app/actions/hrms';
import { processPayroll } from '@/app/actions/payroll';

// Módulo: WhatsApp
import { 
  getConversationsAction, 
  getMessagesAction, 
  sendMessageAction 
} from '@/app/actions/whatsapp';
import { SendMessageInput, WhatsAppFilterState } from '@/types/whatsapp';

// Módulo: Contabilidad
import { 
  getTrialBalanceAction, 
  getJournalEntriesAction, 
  getIncomeStatementAction,
  createJournalEntryAction 
} from '@/app/actions/accounting';
import { FiscalPeriodFilter } from '@/types/accounting';

// Módulo: Configuración & Empresa
import { 
  updateTenantSettings, 
  updateTenantMetadataAction,
  createTenantUserAction 
} from '@/app/actions/tenant';

import { ActionActor } from '@/app/actions/entities';

/**
 * Catálogo de Servicios Centralizados de Rendo ERP.
 * Define la API unificada para interactuar con los módulos del sistema.
 */
export const rendio = {
  catalogo: {
    getItems: (tenantId: string, actor: ActionActor, type?: ItemType, limit?: number) =>
      getItemsAction(tenantId, type, limit, actor),
    createItem: (input: CreateItemActionInput, tenantId: string, actor: ActionActor) =>
      createItemAction(input, tenantId, actor),
    updateItem: (id: string, updates: Partial<CreateItemActionInput>, tenantId: string, actor: ActionActor) =>
      updateItemAction(id, updates, tenantId, actor),
    deleteItem: (id: string, tenantId: string, actor: ActionActor) =>
      deleteItemAction(id, tenantId, actor),
    adjustStock: (id: string, delta: number, tenantId: string, actor: ActionActor) =>
      adjustItemStockAction(id, delta, tenantId, actor),
    archiveItem: (input: { itemId: string; archive?: boolean }, tenantId: string, actor: ActionActor) =>
      archiveItemAction(input, tenantId, actor),
    bulkImport: (items: BulkImportItem[], tenantId: string, actor: ActionActor) =>
      bulkImportItemsAction(items, tenantId, actor),
    receiveStock: (itemId: string, qty: number, unitCost: number, tenantId: string, actor: ActionActor) =>
      processInventoryReceiptAction(itemId, qty, unitCost, tenantId, actor as any),
  },

  calendario: {
    getAppointments: (tenantId: string, filter?: AppointmentFilterState, actor?: ActionActor) =>
      getAppointmentsAction(tenantId, filter, actor as ActionActor),
    createAppointment: (input: CreateAppointmentInput, tenantId: string, actor: ActionActor) =>
      createAppointmentAction(input, tenantId, actor),
    updateStatus: (id: string, status: AppointmentStatus, tenantId: string, actor: ActionActor) =>
      updateAppointmentStatusAction(id, status, tenantId, actor),
    updatePaymentStatus: (id: string, paymentStatus: 'paid' | 'pending' | 'unrecorded', tenantId: string, actor: ActionActor) =>
      updateAppointmentPaymentStatusAction(id, paymentStatus, tenantId, actor),
    getBookedTimes: (tenantId: string, employeeId: string, date: string) =>
      getBookedTimesAction(tenantId, employeeId, date),
    processPublicBooking: (formData: unknown) =>
      processBookingAction(formData),
  },

  caja: {
    getSessionStatus: (tenantId: string, actor: ActionActor) =>
      getCashSessionStatusAction(tenantId, actor),
    openSession: (initialAmount: number, tenantId: string, actor: ActionActor) =>
      openCashSessionAction(initialAmount, tenantId, actor),
    closeSession: (sessionId: string, countedCash: number, notes: string, tenantId: string, actor: ActionActor) =>
      closeCashSessionAction(sessionId, countedCash, notes, tenantId, actor),
    checkout: (
      cart: Array<{ itemId: string; quantity: number }>,
      entityId: string,
      paymentMethod: string,
      tenantId: string,
      actor: ActionActor,
      localizationCode: LocalizationCode = 'VE',
      idempotencyKey?: string,
      chargeTaxes: boolean = false,
      paymentBreakdown?: Array<{ method: 'cash' | 'card' | 'transfer'; amount: number }>
    ) =>
      processSecureCheckout(
        cart,
        entityId,
        paymentMethod,
        tenantId,
        actor,
        localizationCode,
        idempotencyKey,
        chargeTaxes,
        paymentBreakdown
      ),
  },

  clientes: {
    getEntities: (tenantId: string, actor: ActionActor, type?: EntityType, limit?: number) =>
      getEntitiesAction(tenantId, type, limit, actor),
    createEntity: (input: CreateEntityInput, tenantId: string, actor: ActionActor) =>
      createEntityAction(input, tenantId, actor),
    updateEntity: (id: string, updates: Partial<CreateEntityInput>, tenantId: string, actor: ActionActor) =>
      updateEntityAction(id, updates, tenantId, actor),
    deleteEntity: (id: string, tenantId: string, actor: ActionActor) =>
      deleteEntityAction(id, tenantId, actor),
    getPipelineSummary: (opportunities: any[], tenantId: string, actor: ActionActor) =>
      getCRMPipelineSummaryAction(opportunities, tenantId, actor as any),
    getMRRMetrics: (subscriptions: any[], tenantId: string, actor: ActionActor) =>
      getMRRMetricsAction(subscriptions, tenantId, actor as any),
  },

  equipo: {
    getAttendanceLogs: (tenantId: string, actor?: ActionActor) =>
      getAttendanceLogsAction(tenantId, actor),
    registerAttendance: (payload: AttendanceInput, tenantId: string, actor: ActionActor) =>
      registerAttendanceAction(payload, tenantId, actor),
    processPayrollDisbursement: (periodName: string, employees: any[], tenantId: string, actor: ActionActor) =>
      processPayrollDisbursementAction(periodName, employees, tenantId, actor as any),
    processPayroll: (tenantId: string, employees: any[], actor: ActionActor) =>
      processPayroll(tenantId, employees, actor as any),
  },

  whatsapp: {
    getConversations: (tenantId: string, filter?: WhatsAppFilterState, actor?: ActionActor) =>
      getConversationsAction(tenantId, filter, actor as any),
    getMessages: (conversationId: string, tenantId: string, actor: ActionActor) =>
      getMessagesAction(conversationId, tenantId, actor as any),
    sendMessage: (input: SendMessageInput, tenantId: string, actor: ActionActor) =>
      sendMessageAction(input, tenantId, actor as any),
  },

  contabilidad: {
    getTrialBalance: (tenantId: string, actor: ActionActor, filter?: FiscalPeriodFilter | null) =>
      getTrialBalanceAction(tenantId, filter, actor),
    getJournalEntries: (tenantId: string, actor: ActionActor, filter?: FiscalPeriodFilter | null) =>
      getJournalEntriesAction(tenantId, filter, actor),
    getIncomeStatement: (tenantId: string, actor: ActionActor, filter?: FiscalPeriodFilter | null) =>
      getIncomeStatementAction(tenantId, filter, actor),
    createJournalEntry: (
      payload: {
        entry_date?: string;
        description: string;
        lines: Array<{
          account_code: string;
          account_name?: string;
          debit: number;
          credit: number;
          description?: string;
        }>;
      },
      tenantId: string,
      actor: ActionActor
    ) =>
      createJournalEntryAction(payload, tenantId, actor as any),
  },

  configuracion: {
    updateSettings: (tenantId: string, name: string, metadata: unknown, activeModules: string[] | undefined, actor: ActionActor) =>
      updateTenantSettings(tenantId, name, metadata, activeModules, actor),
    updateMetadata: (tenantId: string, updates: any, actor: ActionActor) =>
      updateTenantMetadataAction(tenantId, updates, actor),
    createUser: (tenantId: string, userEmail: string, temporaryPassword: string, role: any, actor: ActionActor) =>
      createTenantUserAction(tenantId, userEmail, temporaryPassword, role, actor),
  },
};

export type RendioRegistry = typeof rendio;
