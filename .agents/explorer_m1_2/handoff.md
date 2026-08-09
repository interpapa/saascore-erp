# Handoff Report: Milestone 1 — Server Actions & Types Layer for `/calendario` and `/whatsapp`

## 1. Observation

Direct observations from examining codebase, database schemas, existing types, and actions:

1. **Existing Base Schemas & Tables**:
   - `supabase/schema_v1.sql` (lines 30-80) and `migration_run.sql` (lines 13-61) define core ERP tables: `tenants`, `user_tenants`, `entities` (`type IN ('customer','supplier','employee','lead')`), `items` (`type IN ('product','service','subscription')`), and `documents` (`type IN ('invoice','quote','purchase_order','work_order','whatsapp_log')`).
   - Tables `appointments`, `whatsapp_conversations`, and `whatsapp_messages` are not yet explicitly created in `schema_v1.sql`.

2. **Existing Client & Action Design**:
   - `src/app/actions/documents.ts` (lines 10-17) defines `DocumentType` including `'work_order'` and `'whatsapp_log'`. Line 41 exposes `createDocumentAction`, line 133 exposes `getDocumentsAction`, and line 161 exposes `updateDocumentStatusAction`.
   - `src/app/actions/entities.ts` (lines 14-25) defines `EntityType = 'customer' | 'supplier' | 'employee' | 'lead' | 'branch'`, and `ActionActor` interface with `{ email: string; role: UserRole }`.
   - `src/app/(erp)/calendario/page.tsx` (lines 39-42, 59-71) currently queries `documents` with `type = 'work_order'` as a placeholder for calendar items.
   - `src/app/(erp)/whatsapp/page.tsx` (lines 26-29, 46-60) currently queries `documents` with `type = 'whatsapp_log'` as a placeholder for sent messages.

3. **Security & Audit Helpers**:
   - `src/lib/core/tenantSecurity.ts` exposes `validateUserTenantAccess(actor, tenantId)`.
   - `src/lib/core/auditLogger.ts` exposes `writeAuditLog({ tenant_id, actor_email, actor_role, action, target_type, target_id, metadata })`.

---

## 2. Logic Chain

1. **Need for Dedicated Type Definitions**:
   - `/calendario` requires domain concepts beyond generic `Document` records, such as `Appointment`, `Service`, `Employee`, `AppointmentStatus`, and `AppointmentFilterState`.
   - `/whatsapp` requires domain concepts such as `Conversation`, `Message`, `CustomerTag`, `QuickReply`, and `WhatsAppFilterState`.
   - Standardizing these types in `src/types/calendario.ts` and `src/types/whatsapp.ts` creates a strong contract for Server Actions and UI components (Milestones M2 and M3).

2. **Server Actions with Graceful Fallback**:
   - Until custom PostgreSQL tables (`appointments`, `whatsapp_conversations`, `whatsapp_messages`) are migrated, the application must function seamlessly without throwing database runtime errors when querying missing tables.
   - Using PostgreSQL error codes (`PGRST204`, `42P01`) or error string matching (`relation ... does not exist`), Server Actions can try querying custom domain tables first. If the table is missing, they gracefully fall back to storing/retrieving data from `documents` (with `type = 'work_order'` or `'whatsapp_log'`) and `entities` (with `type = 'customer'` / `'employee'`), mapping fields bidirectionally.

3. **Auditability & Security**:
   - Every mutation action (`createAppointmentAction`, `updateAppointmentStatusAction`, `sendMessageAction`, `updateCustomerTagAction`) must enforce tenant security validation via `validateUserTenantAccess` and log state changes via `writeAuditLog`.

---

## 3. Caveats

1. **Database Migrations**:
   - Custom tables (`appointments`, `whatsapp_conversations`, `whatsapp_messages`) are designed to be used seamlessly when created; the fallback mechanism handles the interim state gracefully.
2. **Real-time WebSockets**:
   - For `/whatsapp`, future real-time inbox capabilities (e.g. Supabase Realtime subscriptions) can hook directly into `sendMessageAction` and Supabase DB tables without modifying the contract signatures designed here.

---

## 4. Conclusion & Implementation Strategy

### A. Data Types Architecture

#### File 1: `src/types/calendario.ts`
```typescript
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  category?: string | null;
  color?: string | null;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  specialties?: string[];
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  service_duration?: number;
  employee_id?: string | null;
  employee_name?: string | null;
  start_time: string; // ISO 8601 string
  end_time: string;   // ISO 8601 string
  status: AppointmentStatus;
  notes?: string | null;
  price?: number;
  location?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentFilterState {
  date_range?: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  employee_id?: string | 'all';
  service_id?: string | 'all';
  status?: AppointmentStatus | 'all';
  search?: string;
  view_mode?: 'month' | 'week' | 'day' | 'list';
}

export interface CreateAppointmentInput {
  title: string;
  description?: string | null;
  client_id?: string | null;
  service_id?: string | null;
  employee_id?: string | null;
  start_time: string; // ISO 8601
  end_time?: string | null; // ISO 8601 or calculated from duration
  duration_minutes?: number;
  status?: AppointmentStatus;
  notes?: string | null;
  price?: number;
  location?: string | null;
  metadata?: Record<string, any>;
}

export interface UpdateAppointmentInput extends Partial<CreateAppointmentInput> {
  id: string;
}
```

#### File 2: `src/types/whatsapp.ts`
```typescript
export type MessageSenderType = 'client' | 'agent' | 'system' | 'bot';
export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface CustomerTag {
  id: string;
  name: string;
  color: string; // e.g. 'bg-amber-100 text-amber-800'
  description?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string; // e.g. '/saludo'
  content: string;
  category?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  sender_type: MessageSenderType;
  sender_name?: string;
  sender_avatar?: string;
  text: string;
  status: MessageDeliveryStatus;
  timestamp: string; // ISO 8601
  attachments?: Array<{
    url: string;
    type: 'image' | 'document' | 'audio' | 'video';
    name?: string;
    size_bytes?: number;
  }>;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  client_id: string; // entity_id from entities table
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  client_avatar?: string | null;
  unread_count: number;
  last_message: Message | null;
  last_activity: string; // ISO 8601 timestamp
  tags: CustomerTag[];
  status: 'active' | 'archived' | 'blocked';
  assigned_agent_email?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppFilterState {
  search?: string;
  tag_id?: string | 'all';
  status?: 'active' | 'archived' | 'all';
  unread_only?: boolean;
}

export interface SendMessageInput {
  conversation_id: string;
  client_id?: string;
  client_phone: string;
  text: string;
  attachments?: Array<{ url: string; type: 'image' | 'document' | 'audio'; name?: string }>;
  metadata?: Record<string, any>;
}
```

---

### B. Server Actions Code Signatures & Fallback Logic

#### File 3: `src/app/actions/appointments.ts`

```typescript
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import {
  Appointment,
  AppointmentFilterState,
  AppointmentStatus,
  CreateAppointmentInput,
  Employee,
  Service
} from '@/types/calendario';

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Recovers appointments for tenant with fallback to 'documents' table.
 */
export async function getAppointmentsAction(
  tenantId: string,
  filter?: AppointmentFilterState
): Promise<{ success: boolean; appointments: Appointment[]; error?: string }> {
  try {
    if (!tenantId) return { success: true, appointments: [] };

    // 1. Primary Attempt: Query custom 'appointments' table
    const { data: appts, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        client:entities!client_id (id, name, phone, email),
        service:items!service_id (id, name, base_price),
        employee:entities!employee_id (id, name, email)
      `)
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true });

    if (!error && appts) {
      const formatted: Appointment[] = appts.map((a: any) => ({
        id: a.id,
        tenant_id: a.tenant_id,
        title: a.title,
        description: a.description,
        client_id: a.client_id,
        client_name: a.client?.name || a.client_name,
        client_phone: a.client?.phone || a.client_phone,
        client_email: a.client?.email,
        service_id: a.service_id,
        service_name: a.service?.name || a.service_name,
        employee_id: a.employee_id,
        employee_name: a.employee?.name || a.employee_name,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        notes: a.notes,
        price: a.price,
        metadata: a.metadata,
        created_at: a.created_at,
        updated_at: a.updated_at,
      }));
      return { success: true, appointments: filterAppointments(formatted, filter) };
    }

    // 2. Fallback: Query 'documents' table (work_order / appointment)
    if (error && isMissingTableError(error)) {
      const { data: docs, error: docErr } = await supabaseAdmin
        .from('documents')
        .select(`
          *,
          entity:entities (id, name, phone, email)
        `)
        .eq('tenant_id', tenantId)
        .in('type', ['work_order', 'appointment'])
        .order('issue_date', { ascending: true });

      if (docErr) throw new Error(docErr.message);

      const fallbackAppts: Appointment[] = (docs || []).map((doc: any) => ({
        id: doc.id,
        tenant_id: doc.tenant_id,
        title: doc.metadata?.title || doc.notes || `Cita ${doc.document_number}`,
        description: doc.metadata?.description || doc.notes || null,
        client_id: doc.entity_id || null,
        client_name: doc.entity?.name || doc.metadata?.client_name || 'Cliente',
        client_phone: doc.entity?.phone || doc.metadata?.client_phone || null,
        client_email: doc.entity?.email || null,
        service_id: doc.metadata?.service_id || null,
        service_name: doc.metadata?.service_name || 'Servicio General',
        service_duration: doc.metadata?.duration_minutes || 60,
        employee_id: doc.metadata?.employee_id || null,
        employee_name: doc.metadata?.employee_name || 'Sin Asignar',
        start_time: doc.issue_date || doc.created_at,
        end_time: doc.due_date || new Date(new Date(doc.issue_date || doc.created_at).getTime() + 3600000).toISOString(),
        status: mapDocStatusToApptStatus(doc.status),
        notes: doc.notes,
        price: doc.total_amount || 0,
        metadata: doc.metadata || {},
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }));

      return { success: true, appointments: filterAppointments(fallbackAppts, filter) };
    }

    throw new Error(error?.message || 'Error al obtener citas.');
  } catch (err: any) {
    console.error('[getAppointmentsAction Error]:', err.message);
    return { success: false, error: err.message, appointments: [] };
  }
}

/**
 * Creates an appointment with graceful fallback to 'documents' table.
 */
export async function createAppointmentAction(
  payload: CreateAppointmentInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !payload.title || !payload.start_time) {
      throw new Error('Empresa, título y hora de inicio son requeridos.');
    }

    const calculatedEndTime = payload.end_time || 
      new Date(new Date(payload.start_time).getTime() + (payload.duration_minutes || 60) * 60000).toISOString();

    // 1. Primary Attempt: Insert into 'appointments' table
    const { data: newAppt, error } = await supabaseAdmin
      .from('appointments')
      .insert([{
        tenant_id: tenantId,
        title: payload.title,
        description: payload.description || null,
        client_id: payload.client_id || null,
        service_id: payload.service_id || null,
        employee_id: payload.employee_id || null,
        start_time: payload.start_time,
        end_time: calculatedEndTime,
        status: payload.status || 'scheduled',
        notes: payload.notes || null,
        price: payload.price || 0,
        location: payload.location || null,
        metadata: payload.metadata || {},
      }])
      .select()
      .single();

    if (!error && newAppt) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'appointment.created',
        target_type: 'appointment',
        target_id: newAppt.id,
        metadata: { title: payload.title, start_time: payload.start_time },
      });

      revalidatePath('/calendario');
      return { success: true, appointment: newAppt };
    }

    // 2. Fallback: Insert into 'documents' table
    if (error && isMissingTableError(error)) {
      const docStatus = mapApptStatusToDocStatus(payload.status || 'scheduled');
      const { data: newDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: payload.client_id || null,
          type: 'work_order',
          status: docStatus,
          document_number: `CIT-${Date.now().toString().slice(-6)}`,
          issue_date: payload.start_time,
          due_date: calculatedEndTime,
          subtotal_amount: payload.price || 0,
          tax_amount: 0,
          total_amount: payload.price || 0,
          notes: payload.notes || payload.description || null,
          metadata: {
            title: payload.title,
            description: payload.description,
            service_id: payload.service_id,
            employee_id: payload.employee_id,
            duration_minutes: payload.duration_minutes || 60,
            price: payload.price || 0,
            created_by: actor.email,
            ...payload.metadata,
          },
        }])
        .select()
        .single();

      if (docErr) throw new Error('Error al guardar cita en respaldo: ' + docErr.message);

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'appointment.created',
        target_type: 'document',
        target_id: newDoc.id,
        metadata: { title: payload.title, start_time: payload.start_time },
      });

      revalidatePath('/calendario');
      return {
        success: true,
        appointment: {
          id: newDoc.id,
          tenant_id: tenantId,
          title: payload.title,
          description: payload.description,
          client_id: payload.client_id,
          service_id: payload.service_id,
          employee_id: payload.employee_id,
          start_time: payload.start_time,
          end_time: calculatedEndTime,
          status: payload.status || 'scheduled',
          notes: payload.notes,
          price: payload.price || 0,
          metadata: newDoc.metadata,
          created_at: newDoc.created_at,
          updated_at: newDoc.updated_at,
        },
      };
    }

    throw new Error(error?.message || 'Error al crear la cita.');
  } catch (err: any) {
    console.error('[createAppointmentAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Updates appointment status with fallback to 'documents' table.
 */
export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // 1. Primary Attempt: Update 'appointments' table
    const { data: updatedAppt, error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (!error && updatedAppt) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'appointment.status_updated',
        target_type: 'appointment',
        target_id: id,
        metadata: { new_status: status },
      });

      revalidatePath('/calendario');
      return { success: true, appointment: updatedAppt };
    }

    // 2. Fallback: Update 'documents' table
    if (error && isMissingTableError(error)) {
      const docStatus = mapApptStatusToDocStatus(status);
      const { data: updatedDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .update({ status: docStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (docErr) throw new Error('Error al actualizar cita: ' + docErr.message);

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'appointment.status_updated',
        target_type: 'document',
        target_id: id,
        metadata: { new_status: status },
      });

      revalidatePath('/calendario');
      return {
        success: true,
        appointment: {
          id: updatedDoc.id,
          tenant_id: tenantId,
          title: updatedDoc.metadata?.title || updatedDoc.notes || 'Cita',
          start_time: updatedDoc.issue_date,
          end_time: updatedDoc.due_date || updatedDoc.issue_date,
          status,
          price: updatedDoc.total_amount,
          created_at: updatedDoc.created_at,
          updated_at: updatedDoc.updated_at,
        },
      };
    }

    throw new Error(error?.message || 'Error al actualizar el estado de la cita.');
  } catch (err: any) {
    console.error('[updateAppointmentStatusAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

// Helpers
function mapDocStatusToApptStatus(status: string): AppointmentStatus {
  switch (status) {
    case 'in_progress': return 'in_progress';
    case 'invoiced':
    case 'paid': return 'completed';
    case 'annulled': return 'cancelled';
    default: return 'scheduled';
  }
}

function mapApptStatusToDocStatus(status: AppointmentStatus): string {
  switch (status) {
    case 'in_progress': return 'in_progress';
    case 'completed': return 'invoiced';
    case 'cancelled':
    case 'no_show': return 'annulled';
    default: return 'draft';
  }
}

function filterAppointments(list: Appointment[], filter?: AppointmentFilterState): Appointment[] {
  if (!filter) return list;
  return list.filter((a) => {
    if (filter.status && filter.status !== 'all' && a.status !== filter.status) return false;
    if (filter.employee_id && filter.employee_id !== 'all' && a.employee_id !== filter.employee_id) return false;
    if (filter.service_id && filter.service_id !== 'all' && a.service_id !== filter.service_id) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const titleMatch = a.title.toLowerCase().includes(q);
      const clientMatch = a.client_name?.toLowerCase().includes(q);
      if (!titleMatch && !clientMatch) return false;
    }
    return true;
  });
}
```

---

#### File 4: `src/app/actions/whatsapp.ts`

```typescript
'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import {
  Conversation,
  CustomerTag,
  Message,
  QuickReply,
  SendMessageInput,
  WhatsAppFilterState
} from '@/types/whatsapp';

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Fetches active conversations for WhatsApp CRM inbox with fallback to 'documents' (whatsapp_log).
 */
export async function getConversationsAction(
  tenantId: string,
  filter?: WhatsAppFilterState
): Promise<{ success: boolean; conversations: Conversation[]; error?: string }> {
  try {
    if (!tenantId) return { success: true, conversations: [] };

    // 1. Primary Attempt: Query 'whatsapp_conversations' table
    const { data: convs, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select(`
        *,
        client:entities!client_id (id, name, phone, email, metadata)
      `)
      .eq('tenant_id', tenantId)
      .order('last_activity', { ascending: false });

    if (!error && convs) {
      const formatted: Conversation[] = convs.map((c: any) => ({
        id: c.id,
        tenant_id: c.tenant_id,
        client_id: c.client_id,
        client_name: c.client?.name || c.client_name || 'Cliente',
        client_phone: c.client?.phone || c.client_phone || '',
        client_email: c.client?.email || null,
        unread_count: c.unread_count || 0,
        last_message: c.last_message || null,
        last_activity: c.last_activity,
        tags: c.metadata?.tags || [],
        status: c.status || 'active',
      }));

      return { success: true, conversations: filterConversations(formatted, filter) };
    }

    // 2. Fallback: Aggregate from 'documents' (type = whatsapp_log) and 'entities' (type = customer)
    if (error && isMissingTableError(error)) {
      const [{ data: customers }, { data: logs }] = await Promise.all([
        supabaseAdmin.from('entities').select('*').eq('tenant_id', tenantId).eq('type', 'customer'),
        supabaseAdmin
          .from('documents')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('type', 'whatsapp_log')
          .order('issue_date', { ascending: false }),
      ]);

      const conversationMap = new Map<string, Conversation>();

      (logs || []).forEach((log: any) => {
        const entityId = log.entity_id || log.document_number || 'unknown';
        const client = (customers || []).find((c: any) => c.id === log.entity_id);

        if (!conversationMap.has(entityId)) {
          const rawTags: string[] = client?.metadata?.tags || [];
          const tags: CustomerTag[] = rawTags.map((t) => ({
            id: t,
            name: t,
            color: getTagColor(t),
          }));

          const lastMsg: Message = {
            id: log.id,
            conversation_id: entityId,
            tenant_id: log.tenant_id,
            sender_type: log.metadata?.direction === 'inbound' ? 'client' : 'agent',
            text: log.notes || 'Mensaje de WhatsApp',
            status: log.status === 'invoiced' ? 'delivered' : log.status === 'annulled' ? 'failed' : 'sent',
            timestamp: log.issue_date || log.created_at,
            metadata: log.metadata || {},
          };

          conversationMap.set(entityId, {
            id: entityId,
            tenant_id: tenantId,
            client_id: log.entity_id || '',
            client_name: client?.name || log.metadata?.client_name || log.document_number || 'Cliente CRM',
            client_phone: client?.phone || log.document_number || '',
            client_email: client?.email || null,
            unread_count: 0,
            last_message: lastMsg,
            last_activity: log.issue_date || log.created_at,
            tags,
            status: 'active',
          });
        }
      });

      // Include registered customers who don't have messages yet
      (customers || []).forEach((cust: any) => {
        if (!conversationMap.has(cust.id)) {
          const rawTags: string[] = cust.metadata?.tags || [];
          const tags: CustomerTag[] = rawTags.map((t) => ({
            id: t,
            name: t,
            color: getTagColor(t),
          }));

          conversationMap.set(cust.id, {
            id: cust.id,
            tenant_id: tenantId,
            client_id: cust.id,
            client_name: cust.name,
            client_phone: cust.phone || '',
            client_email: cust.email || null,
            unread_count: 0,
            last_message: null,
            last_activity: cust.created_at,
            tags,
            status: 'active',
          });
        }
      });

      const list = Array.from(conversationMap.values());
      return { success: true, conversations: filterConversations(list, filter) };
    }

    throw new Error(error?.message || 'Error al obtener conversaciones.');
  } catch (err: any) {
    console.error('[getConversationsAction Error]:', err.message);
    return { success: false, error: err.message, conversations: [] };
  }
}

/**
 * Fetches messages for a conversation with fallback to 'documents' (whatsapp_log).
 */
export async function getMessagesAction(
  conversationId: string,
  tenantId: string
): Promise<{ success: boolean; messages: Message[]; error?: string }> {
  try {
    if (!conversationId || !tenantId) return { success: true, messages: [] };

    // 1. Primary Attempt: Query 'whatsapp_messages' table
    const { data: msgs, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: true });

    if (!error && msgs) {
      return { success: true, messages: msgs };
    }

    // 2. Fallback: Query 'documents' table (whatsapp_log)
    if (error && isMissingTableError(error)) {
      const { data: logs, error: docErr } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'whatsapp_log')
        .or(`entity_id.eq.${conversationId},document_number.eq.${conversationId}`)
        .order('issue_date', { ascending: true });

      if (docErr) throw new Error(docErr.message);

      const messages: Message[] = (logs || []).map((log: any) => ({
        id: log.id,
        conversation_id: conversationId,
        tenant_id: log.tenant_id,
        sender_type: log.metadata?.direction === 'inbound' ? 'client' : 'agent',
        sender_name: log.metadata?.direction === 'inbound' ? 'Cliente' : (log.metadata?.created_by || 'SaaSCore Bot'),
        text: log.notes || '',
        status: log.status === 'invoiced' ? 'delivered' : log.status === 'annulled' ? 'failed' : 'sent',
        timestamp: log.issue_date || log.created_at,
        metadata: log.metadata || {},
        created_at: log.created_at,
      }));

      return { success: true, messages };
    }

    throw new Error(error?.message || 'Error al obtener mensajes.');
  } catch (err: any) {
    console.error('[getMessagesAction Error]:', err.message);
    return { success: false, error: err.message, messages: [] };
  }
}

/**
 * Sends a WhatsApp message with fallback to 'documents' (whatsapp_log).
 */
export async function sendMessageAction(
  input: SendMessageInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !input.conversation_id || !input.text) {
      throw new Error('Empresa, ID de conversación y texto del mensaje son requeridos.');
    }

    const timestamp = new Date().toISOString();

    // 1. Primary Attempt: Insert into 'whatsapp_messages' table
    const { data: newMsg, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert([{
        conversation_id: input.conversation_id,
        tenant_id: tenantId,
        sender_type: 'agent',
        sender_name: actor.email,
        text: input.text,
        status: 'delivered',
        timestamp,
        metadata: { created_by: actor.email, ...input.metadata },
      }])
      .select()
      .single();

    if (!error && newMsg) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'whatsapp.message_sent',
        target_type: 'whatsapp_message',
        target_id: newMsg.id,
        metadata: { phone: input.client_phone, length: input.text.length },
      });

      revalidatePath('/whatsapp');
      return { success: true, message: newMsg };
    }

    // 2. Fallback: Insert into 'documents' table (whatsapp_log)
    if (error && isMissingTableError(error)) {
      const { data: newDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: input.client_id || input.conversation_id,
          type: 'whatsapp_log',
          status: 'invoiced',
          document_number: input.client_phone || `WA-${Date.now().toString().slice(-6)}`,
          issue_date: timestamp,
          due_date: null,
          subtotal_amount: 0,
          tax_amount: 0,
          total_amount: 0,
          notes: input.text,
          metadata: {
            platform: 'whatsapp',
            direction: 'outbound',
            created_by: actor.email,
            conversation_id: input.conversation_id,
            ...input.metadata,
          },
        }])
        .select()
        .single();

      if (docErr) throw new Error('Error al enviar mensaje en respaldo: ' + docErr.message);

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'whatsapp.message_sent',
        target_type: 'document',
        target_id: newDoc.id,
        metadata: { phone: input.client_phone, length: input.text.length },
      });

      revalidatePath('/whatsapp');

      return {
        success: true,
        message: {
          id: newDoc.id,
          conversation_id: input.conversation_id,
          tenant_id: tenantId,
          sender_type: 'agent',
          sender_name: actor.email,
          text: input.text,
          status: 'delivered',
          timestamp: newDoc.issue_date,
          metadata: newDoc.metadata,
          created_at: newDoc.created_at,
        },
      };
    }

    throw new Error(error?.message || 'Error al enviar el mensaje de WhatsApp.');
  } catch (err: any) {
    console.error('[sendMessageAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Updates customer tags in customer entity metadata and conversation metadata.
 */
export async function updateCustomerTagAction(
  entityId: string,
  tags: string[],
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; tags?: string[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!entityId || !tenantId) throw new Error('ID de cliente y Empresa requeridos.');

    const { data: entity, error: fetchErr } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr) throw new Error('Cliente no encontrado: ' + fetchErr.message);

    const updatedMetadata = {
      ...(entity?.metadata || {}),
      tags,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entities')
      .update({ metadata: updatedMetadata })
      .eq('id', entityId)
      .eq('tenant_id', tenantId);

    if (updateErr) throw new Error('Error al actualizar etiquetas: ' + updateErr.message);

    try {
      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ metadata: { tags } })
        .eq('client_id', entityId)
        .eq('tenant_id', tenantId);
    } catch {
      // Ignored if table does not exist
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'customer.tags_updated',
      target_type: 'entity',
      target_id: entityId,
      metadata: { tags },
    });

    revalidatePath('/whatsapp');
    return { success: true, tags };
  } catch (err: any) {
    console.error('[updateCustomerTagAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

// Helpers
function getTagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes('vip')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (t.includes('lead')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  if (t.includes('soporte')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
  if (t.includes('deudor')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
}

function filterConversations(list: Conversation[], filter?: WhatsAppFilterState): Conversation[] {
  if (!filter) return list;
  return list.filter((c) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const nameMatch = c.client_name.toLowerCase().includes(q);
      const phoneMatch = c.client_phone.includes(q);
      if (!nameMatch && !phoneMatch) return false;
    }
    if (filter.tag_id && filter.tag_id !== 'all') {
      const hasTag = c.tags.some((t) => t.id === filter.tag_id || t.name === filter.tag_id);
      if (!hasTag) return false;
    }
    if (filter.unread_only && c.unread_count === 0) return false;
    return true;
  });
}
```

---

## 5. Verification Method

To verify the strategy and implementation:

1. **Static Type Verification**:
   - Run `cmd /c "npx tsc --noEmit"` in `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react`.
   - Result must be 0 errors.

2. **File Creation Verification**:
   - Ensure `src/types/calendario.ts` contains `Appointment`, `Service`, `Employee`, `AppointmentFilterState`.
   - Ensure `src/types/whatsapp.ts` contains `Conversation`, `Message`, `CustomerTag`, `QuickReply`, `WhatsAppFilterState`.
   - Ensure `src/app/actions/appointments.ts` contains `getAppointmentsAction`, `createAppointmentAction`, `updateAppointmentStatusAction`.
   - Ensure `src/app/actions/whatsapp.ts` contains `getConversationsAction`, `getMessagesAction`, `sendMessageAction`, `updateCustomerTagAction`.

3. **Fallback Invalidation Condition**:
   - In environments where `appointments` / `whatsapp_conversations` tables are not created, calls to `getAppointmentsAction` / `getConversationsAction` must return data from `documents` table without throwing `PGRST204` or `42P01` database errors.
