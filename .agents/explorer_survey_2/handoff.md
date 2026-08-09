# Handoff Report — Explorer 2: `/calendario` & `/whatsapp` Domain Survey

**Agent**: teamwork_preview_explorer (Explorer 2)  
**Date**: 2026-08-07  
**Working Directory**: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_survey_2`  
**Target Project Path**: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react`  

---

## 1. Observation

### 1.1 `/calendario` Domain (Gestión de Citas y Turnos)
- **Page File**: `src/app/(erp)/calendario/page.tsx` (269 lines)
  - Uses `'use client'`.
  - Layout: `max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Respects layout padding and header spacing.
  - Features present: 3 KPI cards ("Citas Hoy", "Pendientes", "Completadas"), month header navigation (Prev, Next, "Hoy"), and custom 7-column month grid (`getDaysInMonth`).
  - Data fetching (Lines 39-42): Calls `getDocumentsAction(currentTenant.id, 'work_order')` and `getEntitiesAction(currentTenant.id, 'customer')`.
  - Event creation (Lines 57-76): Triggers `createDocumentAction` saving a document of `type: 'work_order'`, `status: 'draft'`, with `document_number: OT-xxxxxx`.
  - Modal used (Line 261): Renders `TicketModal` (`src/components/tickets/TicketModal.tsx`).
- **Modal Component**: `src/components/tickets/TicketModal.tsx` (153 lines)
  - Form designed for generic work orders ("Nueva Orden de Trabajo").
  - Fields: Client (`entity_id`), Title (`title`), Description (`description`), Priority (`low`, `medium`, `high`).
  - **Lacks**: Service selection (`items` of type `'service'`), Staff/Employee selection (`entities` of type `'employee'`), appointment date picker, start/end time pickers, and duration setting.
- **Data Model Overloading**: No `appointments` table exists in Supabase schema. Appointment records are currently proxied through the generic `documents` table (`type = 'work_order'`).

### 1.2 `/whatsapp` Domain (CRM Inbox Omnicanal)
- **Page File**: `src/app/(erp)/whatsapp/page.tsx` (297 lines)
  - Uses `'use client'`.
  - Layout: `max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.
  - Features present: 3 KPI cards ("Enviados Hoy", "Entregados", "Errores / Rebotes"), 600px height split-pane CRM container.
  - Sidebar (Lines 145-201): Client search input (`searchTerm`) and scrollable conversation list grouped by client (`entity_id`).
  - Main Chat Area (Lines 203-285): Header with client name/phone, scrollable chat message bubbles (`#d9fdd3` light mode / `#005c4b` dark mode), and bottom simulated input bar.
  - Data fetching (Lines 26-29): **Bypasses Server Actions** by importing client-side helpers `getDocuments('whatsapp_log')` and `getEntities('customer')` directly from `@/lib/api/documents` and `@/lib/api/entities`.
  - Input Action (Lines 260-269): Bottom input bar is a clickable button that pops up `WhatsAppModal` instead of allowing direct typing in the chat pane.
- **Modal Component**: `src/components/whatsapp/WhatsAppModal.tsx` (142 lines)
  - Form for sending WhatsApp message: Client select (`entity_id`) and message textarea. Checks for valid phone number.
- **Missing Features**:
  - No customer tags/labels (`VIP`, `Lead`, `Soporte`, `Cotizado`).
  - Outbound-only messages stored in `documents` (`type = 'whatsapp_log'`). No incoming (inbound) message handling or simulation.
  - No message delivery status timeline or template/canned response shortcuts.

### 1.3 Database Schemas & Backend Architecture
- **Schema Files**: `supabase/schema_v1.sql` (196 lines) and `migration_run.sql` (109 lines).
  - Tables present: `tenants`, `user_tenants`, `entities` (`customer`, `supplier`, `employee`, `lead`, `branch`), `items` (`product`, `service`, `subscription`), `documents` (`invoice`, `purchase_order`, `quotation`, `work_order`, `whatsapp_log`), `document_lines`, `journal_entries`, `journal_entry_lines`, `audit_logs`.
  - Tables missing: `appointments`, `whatsapp_conversations`, `whatsapp_messages`.
- **Server Actions**: `src/app/actions/` contains 14 action files (`accounting.ts`, `documents.ts`, `entities.ts`, `crm.ts`, `items.ts`, etc.).
  - Missing: `appointments.ts` and `whatsapp.ts`.
- **Types**: `src/types/` only contains `lego.ts`. Domain TypeScript definition files for appointments and WhatsApp CRM are missing.

---

## 2. Logic Chain

1. **Observation**: `calendario/page.tsx` uses `documents` with `type: 'work_order'` and `TicketModal.tsx`.
   **Reasoning**: Appointments are being treated as generic work orders without scheduling details (service type, assigned staff, start/end timestamps). To fulfill `ORIGINAL_REQUEST.md` (R2: specialized interactive calendar grid with service event creator & employee assignment), the domain requires a structured appointment model and a dedicated modal component (`AppointmentModal.tsx`).

2. **Observation**: `calendario/page.tsx` only renders a custom monthly grid generated via `getDaysInMonth`.
   **Reasoning**: A complete appointment management system requires view toggling (Month view vs. Week view with hourly time slots), as well as filter controls by assigned staff member or service category.

3. **Observation**: `whatsapp/page.tsx` calls `getDocuments('whatsapp_log')` directly from `@/lib/api/documents` on the browser client.
   **Reasoning**: This bypasses Server Action security checks (`validateUserTenantAccess`) and WORM audit logging (`writeAuditLog`). To align with project architecture standards, `/whatsapp` data access must be migrated to Server Actions (`src/app/actions/whatsapp.ts`).

4. **Observation**: `whatsapp/page.tsx` triggers a modal for sending messages, lacks customer tags/labels, and only records outbound logs.
   **Reasoning**: To fulfill `ORIGINAL_REQUEST.md` (R2: WhatsApp CRM Inbox with conversation list, message history, customer tags, and transactional sending), the chat UI should feature an inline chat input field, customer tag pills in the chat header, canned templates, and bidirectional conversation history.

5. **Observation**: Neither `schema_v1.sql` nor `migration_run.sql` include dedicated tables for appointments or WhatsApp conversations.
   **Reasoning**: A clean production design requires either executing a new Supabase migration for `appointments`, `whatsapp_conversations`, and `whatsapp_messages` (Option A), or extending the `metadata` JSONB fields on `documents` and `entities` (Option B fallback).

---

## 3. Caveats

- **Database Migration Execution**: Adding new PostgreSQL tables (`appointments`, `whatsapp_conversations`, `whatsapp_messages`) requires applying SQL migrations in Supabase. If Supabase DB execution is restricted during phase implementation, Option B (utilizing `documents.metadata` and `entities.metadata`) provides a zero-migration fallback without breaking existing schema constraints.
- **External WhatsApp API**: Integration with Meta Cloud API / WhatsApp Webhook is outside the scope of frontend UI development. The `/whatsapp` CRM domain will simulate real-time conversational messaging persisted in the local Supabase database.

---

## 4. Conclusion

Both `/calendario` and `/whatsapp` domains have foundational UI structures in place but require specialized domain models, dedicated Server Actions, TypeScript type declarations, and refined interactive UI components.

### Required Mapping & Implementation Roadmap

#### A. `/calendario` (Gestión de Citas y Turnos)
1. **Types**: Create `src/types/calendario.ts`:
   - `AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'`
   - `Appointment = { id, tenant_id, client_id, employee_id, service_id, title, start_time, end_time, status, notes, metadata, client?, employee?, service? }`
2. **Server Actions**: Create `src/app/actions/appointments.ts`:
   - `getAppointmentsAction(tenantId, filters?)`
   - `createAppointmentAction(input, tenantId, actor)`
   - `updateAppointmentStatusAction(id, status, tenantId, actor)`
3. **Database Schema (Option A / Option B)**:
   - Option A: Table `public.appointments` (`tenant_id`, `client_id`, `employee_id`, `service_id`, `title`, `start_time`, `end_time`, `status`, `notes`, `metadata`).
   - Option B: Use `documents` with `type = 'appointment'` and structured `metadata` (`service_id`, `employee_id`, `start_time`, `end_time`).
4. **UI Components**:
   - `src/components/calendario/AppointmentModal.tsx`: Service selector (`items`), Staff selector (`entities`), Client selector, Date/Time pickers.
   - Refactored `src/app/(erp)/calendario/page.tsx`: Add Month / Week view toggle, staff/service filter dropdowns, and interactive slot click handling.

#### B. `/whatsapp` (CRM Inbox Omnicanal)
1. **Types**: Create `src/types/whatsapp.ts`:
   - `MessageDirection = 'inbound' | 'outbound'`
   - `MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'`
   - `WhatsAppMessage = { id, conversation_id, sender_type, message_text, status, created_at, metadata }`
   - `WhatsAppConversation = { id, tenant_id, customer_id, phone, unread_count, tags, last_message_at, status, customer?, last_message? }`
2. **Server Actions**: Create `src/app/actions/whatsapp.ts`:
   - `getWhatsAppConversationsAction(tenantId, search?)`
   - `getWhatsAppMessagesAction(conversationId, tenantId)`
   - `sendWhatsAppMessageAction(input, tenantId, actor)`
   - `updateConversationTagsAction(conversationId, tags, tenantId, actor)`
3. **Database Schema (Option A / Option B)**:
   - Option A: Tables `public.whatsapp_conversations` & `public.whatsapp_messages`.
   - Option B: Use `documents` with `type = 'whatsapp_log'` and structured `metadata` (`conversation_id`, `tags`, `sender_type`, `direction`).
4. **UI Components**:
   - Refactored `src/app/(erp)/whatsapp/page.tsx`: Direct inline message input bar in chat pane, interactive customer tags (`VIP`, `Lead`, `Soporte`) editor in chat header, quick template message selector, and conversation status tabs (Todas, Sin Leer, Archivadas).

---

## 5. Verification Method

To verify the current state or implementation progress:
1. **File Inspection**:
   - `src/app/(erp)/calendario/page.tsx`
   - `src/app/(erp)/whatsapp/page.tsx`
   - `src/components/tickets/TicketModal.tsx`
   - `src/components/whatsapp/WhatsAppModal.tsx`
   - `supabase/schema_v1.sql`
2. **TypeScript Compilation Check**:
   - Execute: `cmd /c "npx tsc --noEmit"`
   - Expected result: 0 errors.
