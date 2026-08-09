# Handoff Report — Milestone 2: Specialized UI `/calendario` (Gestión de Citas y Turnos)

## 1. Observation

### 1.1 Existing Codebase & Audited Files
- **`src/app/(erp)/calendario/page.tsx`**:
  - Currently contains inline, non-modularized monthly grid logic (lines 85-259).
  - Uses legacy `getDocumentsAction(currentTenant.id, 'work_order')` and `createDocumentAction` instead of dedicated appointment server actions.
  - Imports and opens `TicketModal` (`@/components/tickets/TicketModal`) rather than a specialized appointment service creator modal.
  - Lacks weekly grid view (`week`), employee filter dropdown, status filter dropdown, search input, and service selection.
  - Lacks Toast notifications (no `useToast()` integrated for user feedback) and optimistic state management.
  - Does not render `<EmptyState />` when the calendar grid has 0 items for the selected month/filters.
- **`src/types/calendario.ts`**:
  - Defines `AppointmentStatus` ('scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show').
  - Defines `Service`, `Employee`, `Appointment`, `AppointmentFilterState`, `CreateAppointmentInput`, `UpdateAppointmentInput`.
- **`src/app/actions/appointments.ts`**:
  - Contains `getAppointmentsAction(tenantId, filter)` (lines 27-118), with primary query to `appointments` table and fallback to `documents` table (`type: 'work_order' / 'appointment'`).
  - Contains `createAppointmentAction(payload, tenantId, actor)` (lines 123-248), inserting into `appointments` or falling back to `documents`.
  - Contains `updateAppointmentStatusAction(id, status, tenantId, actor)` (lines 253-336).
- **`src/components/core/EmptyState.tsx`**:
  - Reusable empty state component taking `icon`, `title`, `description`, `action` (`{ label, onClick }`), and `className`.
- **`src/components/core/ToastProvider.tsx`**:
  - Provides `useToast()` context with variants `'success' | 'error' | 'info' | 'warning'`. Toast container is rendered at `bottom-left` with `z-80`.

### 1.2 Layout & Design System Requirements
- Outer Container: `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.
- Distance from FloatingHeader: 80px top clearance preserved via container padding & section margins.
- Z-Index Hierarchy Compliance:
  - FloatingHeader: `z-40`
  - AICopilot orb: `z-50` (fixed at `bottom-right`)
  - Modals / Drawers (`AppointmentModal`, `AppointmentDetailsModal`): `z-60` with backdrop `bg-black/50 backdrop-blur-sm`
  - ToastProvider: `z-80` (fixed at `bottom-left`)
- Design Tokens & Classes: `btn-haptic`, `bg-primary`, `text-primary-foreground`, `bg-card`, `border-border`, `rounded-3xl`, `shadow-sm`.

---

## 2. Logic Chain

### 2.1 Architectural Component Breakdown
To deliver a high-performance, modular, and specialized `/calendario` UI, the page must be split into dedicated components under `src/components/calendario/`:

```
src/
├── app/(erp)/calendario/
│   └── page.tsx                         # Main Orchestrator Page (State, Actions, Layout)
└── components/calendario/
    ├── CalendarKPIs.tsx                 # Top KPI Cards (Citas Hoy, Pendientes, Completadas)
    ├── CalendarFilters.tsx              # View Switcher (Month/Week), Nav, Employee & Status Filters, CTA
    ├── CalendarGrid.tsx                 # Interactive Month & Week Grid with EmptyState fallback
    ├── AppointmentModal.tsx             # Service Event Creator Modal with Staff, Service, Date/Time pickers
    └── AppointmentDetailsModal.tsx      # Quick View & Status Action Drawer/Modal
```

### 2.2 Detailed Component Designs & Contracts

#### Component 1: `CalendarKPIs.tsx` (`src/components/calendario/CalendarKPIs.tsx`)
- **Responsibility**: Computes and displays real-time metrics for appointments.
- **Props Interface**:
  ```typescript
  export interface CalendarKPIsProps {
    appointments: Appointment[];
  }
  ```
- **KPI Calculations**:
  - `citasHoy`: Count where `start_time.startsWith(todayYYYYMMDD)`.
  - `pendientes`: Count where `status` is `'scheduled'`, `'confirmed'`, or `'in_progress'`.
  - `completadas`: Count where `status === 'completed'`.
  - `ingresosEstimados`: Sum of `price` for non-cancelled appointments.
- **UI Grid**: `grid grid-cols-1 md:grid-cols-3 gap-6`. Uses design system card tokens `bg-card border border-border p-6 rounded-3xl shadow-sm`.

#### Component 2: `CalendarFilters.tsx` (`src/components/calendario/CalendarFilters.tsx`)
- **Responsibility**: Houses controls for view mode switching, period navigation, text search, employee filtering, status filtering, and appointment creation trigger.
- **Props Interface**:
  ```typescript
  export interface CalendarFiltersProps {
    viewMode: 'month' | 'week';
    onViewModeChange: (mode: 'month' | 'week') => void;
    currentDate: Date;
    onDateChange: (date: Date) => void;
    filterState: AppointmentFilterState;
    onFilterChange: (filters: AppointmentFilterState) => void;
    employees: Employee[];
    services: Service[];
    onOpenCreateModal: () => void;
  }
  ```
- **Key Features**:
  - **View Switcher**: Segmented toggle between `"Mes"` (Month) and `"Semana"` (Week) with active styling (`bg-primary text-primary-foreground`).
  - **Period Navigation**: `<` (Previous), `"Hoy"` (Today reset), `>` (Next). Updates `currentDate` state by month or week interval.
  - **Period Title**: Formatted string (e.g. `"Agosto 2026"` for month view; `"3 - 9 de Agosto, 2026"` for week view).
  - **Search Input**: Debounced filter input searching appointment title and client name.
  - **Employee Filter Dropdown**: Displays `all` or specific employee options populated from `employees`.
  - **Status Filter Dropdown**: Options for `'all'`, `'scheduled'`, `'confirmed'`, `'in_progress'`, `'completed'`, `'cancelled'`, `'no_show'`.
  - **Primary CTA**: Button with `<Plus size={16} /> Agendar Cita` using `btn-haptic bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold`.

#### Component 3: `CalendarGrid.tsx` (`src/components/calendario/CalendarGrid.tsx`)
- **Responsibility**: Interactive monthly and weekly event grid rendering appointment cards with color-coded status badges, time indicators, hover states, and empty state fallback.
- **Props Interface**:
  ```typescript
  export interface CalendarGridProps {
    viewMode: 'month' | 'week';
    currentDate: Date;
    appointments: Appointment[];
    isLoading: boolean;
    onSelectAppointment: (appt: Appointment) => void;
    onSelectDateSlot: (date: Date, timeStr?: string) => void;
    onOpenCreateModal: () => void;
  }
  ```
- **Month Grid Logic**:
  - Grid: `grid grid-cols-7 gap-2 sm:gap-4`. Headers: `['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']`.
  - Day Cell: Highlight today with `border-primary/50 bg-primary/5 dark:bg-primary/10`. Date number badge in `bg-primary text-primary-foreground` if today.
  - Event Cards inside Day Cell: Badges styled by status:
    - `scheduled`: `bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300` (Dot: `bg-blue-500`)
    - `confirmed`: `bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300` (Dot: `bg-indigo-500`)
    - `in_progress`: `bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300` (Dot: `bg-amber-500`)
    - `completed`: `bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300` (Dot: `bg-emerald-500`)
    - `cancelled`: `bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300` (Dot: `bg-rose-500`)
    - `no_show`: `bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300` (Dot: `bg-slate-500`)
- **Week Grid Logic**:
  - Calculates start of week (Sunday/Monday) through end of week (7 days).
  - Time Gutter: Rows from `08:00` to `20:00`.
  - Event Blocks: Absolute/grid positioning calculated from `start_time` and `end_time` (e.g. top percentage based on hour, height based on duration). Renders service title, client name, employee avatar/badge, start-end time pill.
- **Graceful Empty State**:
  - If `!isLoading` and `appointments.length === 0`:
    ```tsx
    <EmptyState
      icon={<CalendarDays size={48} />}
      title="No hay citas programadas"
      description="No se encontraron citas ni turnos para el período o filtros seleccionados."
      action={{
        label: "Agendar Primera Cita",
        onClick: onOpenCreateModal,
      }}
    />
    ```

#### Component 4: `AppointmentModal.tsx` (`src/components/calendario/AppointmentModal.tsx`)
- **Responsibility**: Modal dialog for creating a service appointment with service selection, staff assignment, date/time pickers, and internal notes.
- **Props Interface**:
  ```typescript
  export interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (input: CreateAppointmentInput) => Promise<void>;
    employees: Employee[];
    services: Service[];
    clients: Entity[];
    initialDate?: Date | null;
    initialTime?: string | null;
  }
  ```
- **Form Controls & Fields**:
  1. **Servicio Selector**: `<select>` option list from `services`. Selecting a service automatically sets `title` (service name), `duration_minutes` (service duration), and `price` (service base_price).
  2. **Título de la Cita**: Text input for appointment title.
  3. **Cliente**: `<select>` option list from `clients` with fallback manual name input.
  4. **Empleado Asignado**: `<select>` option list from `employees`.
  5. **Fecha de la Cita**: Date input (`YYYY-MM-DD`).
  6. **Hora de Inicio & Hora de Fin**: Time inputs (`HH:mm`). Changing start time auto-calculates end time using `duration_minutes`.
  7. **Estado**: Dropdown select (`scheduled` | `confirmed` | `in_progress` | `completed`).
  8. **Precio**: Number input (`step="0.01"`).
  9. **Notas**: Textarea input for client request or internal observations.
- **Z-Index & Overlay**: `fixed inset-0 z-60 flex items-center justify-center p-4`, backdrop `bg-black/50 backdrop-blur-sm`.

#### Component 5: `AppointmentDetailsModal.tsx` (`src/components/calendario/AppointmentDetailsModal.tsx`)
- **Responsibility**: Quick view and status transition modal for existing appointment cards.
- **Props Interface**:
  ```typescript
  export interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  }
  ```
- **Key Actions**: Status action buttons ("Confirmar", "Iniciar", "Completar", "Cancelar") executing `updateAppointmentStatusAction`.

### 2.3 Main Page Architecture (`src/app/(erp)/calendario/page.tsx`)
- **Data Hydration**:
  - Uses `useTenantResolver()` to get active tenant ID.
  - Uses `useERPStore()` for session actor info (`email`, `role`).
  - Calls in parallel via `Promise.all`:
    1. `getAppointmentsAction(tenantId, filterState)`
    2. `getEntitiesAction(tenantId, 'employee')`
    3. `getEntitiesAction(tenantId, 'customer')`
    4. `getItemsAction(tenantId, 'service')`
- **Optimistic State Management (`useOptimistic` Hook / Queue)**:
  - When user creates an appointment:
    - Prepend optimistic item to local state (`id: 'temp-' + Date.now()`).
    - Trigger `createAppointmentAction(payload, tenantId, actor)`.
    - On success: Replace temporary item with returned server appointment, show success Toast (`toast({ variant: 'success', title: 'Cita Creada', description: 'La cita se agendó exitosamente.' })`).
    - On error: Revert optimistic state, show error Toast (`toast({ variant: 'error', title: 'Error al agendar', description: err.message })`).
  - When user changes status:
    - Update local state status optimistically.
    - Trigger `updateAppointmentStatusAction(id, status, tenantId, actor)`.
    - On success: Sync state, show Toast feedback.
    - On error: Revert status, show error Toast.

---

## 3. Caveats

1. **Database Table Fallback**: The custom `appointments` table may not exist in initial Supabase database schemas. `getAppointmentsAction` and `createAppointmentAction` automatically fallback to `documents` table with `type: 'work_order' / 'appointment'`. The UI components seamlessly handle appointments regardless of underlying storage table.
2. **Fallback Entities**: If no employees (`type: 'employee'`) or services (`type: 'service'`) exist in the database, `AppointmentModal` and `CalendarFilters` must supply graceful fallback default options (e.g. "Personal General", "Servicio General") so dropdowns are never broken or empty.
3. **Read-Only Scope**: This report provides the architectural design specification. Implementation must be performed by the Implementer agent following these exact specifications.

---

## 4. Conclusion

The design for Milestone 2 (`/calendario`) establishes a fully specialized, mock-free UI for appointment and shift management. Key highlights include:
1. Complete modularization into `CalendarKPIs`, `CalendarFilters`, `CalendarGrid`, `AppointmentModal`, and `AppointmentDetailsModal`.
2. Interactive monthly and weekly view grid support (`month` / `week`).
3. Integration with Supabase Server Actions (`getAppointmentsAction`, `createAppointmentAction`, `updateAppointmentStatusAction`).
4. Full adherence to design system containers (`max-w-6xl mx-auto px-4 sm:px-6 py-6`), FloatingHeader 80px clearance, z-index hierarchy (`z-40` header, `z-50` copilot, `z-60` modal, `z-80` toast), `EmptyState` component fallback, and Toast notifications.

---

## 5. Verification Method

To independently verify the implementation strategy and code additions:

### 5.1 Static Verification
Run TypeScript type-check to confirm zero compilation or type errors:
```bash
cmd /c "npx tsc --noEmit"
```

### 5.2 File & Component Inspection
Verify the creation of files in their designated directories:
- `src/components/calendario/CalendarKPIs.tsx`
- `src/components/calendario/CalendarFilters.tsx`
- `src/components/calendario/CalendarGrid.tsx`
- `src/components/calendario/AppointmentModal.tsx`
- `src/components/calendario/AppointmentDetailsModal.tsx`
- `src/app/(erp)/calendario/page.tsx`

### 5.3 Invalidation Conditions
The verification fails if:
- Any file in `src/app/(erp)/` contains hardcoded mock arrays.
- `CalendarGrid` fails to render week view or empty state when appointment list is empty.
- Modals overlap or get covered by FloatingHeader / AICopilot orb.
- TypeScript compiler returns any type error (`tsc --noEmit`).
