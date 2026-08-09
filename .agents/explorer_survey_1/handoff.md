# Codebase Audit and Mock Data Inventory Report

**Agent**: teamwork_preview_explorer (Explorer 1)  
**Working Directory**: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_survey_1`  
**Date**: 2026-08-07  

---

## 1. Observation

### A. TypeScript Build Status & Dependencies
- **Command executed**: `cmd /c "npx tsc --noEmit"`
- **Result**: `0` compilation errors found. Output: empty (clean build).
- **`package.json` dependencies**:
  - Main: `@supabase/supabase-js` (^2.107.0), `decimal.js` (^10.6.0), `lucide-react` (^1.17.0), `next` (16.2.7), `next-themes` (^0.4.6), `react` (19.2.4), `react-dom` (19.2.4), `zustand` (^5.0.14).
  - Dev: `@tailwindcss/postcss` (^4), `@types/node` (^20), `@types/react` (^19), `@types/react-dom` (^19), `eslint` (^9), `eslint-config-next` (16.2.7), `tailwindcss` (^4), `typescript` (^5).
- **Environment Setup**: No `.env` or `.env.local` files exist in the repository root. Supabase keys rely on runtime environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

### B. Supabase Setup & Server Actions Architecture
- **Supabase Clients**:
  - `src/lib/supabase.ts:6`: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)` (Client-side / Anon client).
  - `src/lib/supabaseAdmin.ts:19`: `export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, ...)` (Server-side / Admin client with service role key).
  - Note: `@supabase/ssr` package is not installed; client instances are managed directly via `createClient`.
- **Existing Server Actions** (`src/app/actions/`):
  - `accounting.ts`: FX revaluation actions (`processFXRevaluation`).
  - `checkout.ts`: POS checkout flow (`processSecureCheckout`), cart validation, document creation, stock deduction, tax calculation, audit logging.
  - `crm.ts`: Subscription and MRR calculations.
  - `documents.ts`: CRUD for `documents` and `document_lines` (`getDocumentsAction`, `createDocumentAction`).
  - `enterprise.ts`: Multi-branch metrics (`getEnterpriseMetricsAction`).
  - `entities.ts`: CRUD for `entities` (`getEntitiesAction`, `createEntityAction`, `updateEntityAction`, `deleteEntityAction`).
  - `hrms.ts`: Payroll and employee management.
  - `inventory.ts`: Stock adjustment actions.
  - `items.ts`: CRUD for `items` (`getItemsAction`, `createItemAction`).
  - `mrp.ts`: Manufacturing orders & BOM.
  - `payments.ts`: Payment processing & journal entry creation (`accounting_entries`).
  - `payroll.ts`: Payroll processing & document creation.
  - `procurement.ts`: Purchase order creation (`createPurchaseOrderAction`).
  - `tenant.ts`: Tenant CRUD & status toggling (`updateTenantSettings`, `toggleTenantStatus`, `getAllTenants`).
- **Database Schemas & SQL Files**:
  - `sql/production_auth.sql`: Defines `public.user_tenants` and RLS policies based on `auth.uid()`.
  - `sql/multi_tenant.sql`: Defines `public.tenants` and adds `tenant_id` to `entities`, `items`, `documents`.
  - `migration_run.sql`: Contains DDL for `tenants`, `entities`, `items`, `documents`, `document_lines`, `user_tenants`.
  - Tables referenced in code but missing from base SQL migration: `accounting_entries` / `journal_entries` / `journal_entry_lines` (in `payments.ts` & `ledgerKernel.ts`), `audit_logs` (in `auditLogger.ts`), `exchange_rates` (in `currencyEngine.ts`), `whatsapp_conversations`, `whatsapp_messages`, `calendar_events`.

### C. Inventory of Mock Data & UI Domain Gaps per Module

1. **`/calendario` (`src/app/(erp)/calendario/page.tsx`)**:
   - **Current Implementation**: Repurposes `documents` table with `type: 'work_order'`. Uses `TicketModal` (`src/components/tickets/TicketModal.tsx`) to schedule work orders.
   - **Lines 79-82**: Calculates KPIs from `tickets` (`citasHoy`, `pendientes`, `completadas`).
   - **Lines 85-115**: Basic month grid generator (`getDaysInMonth`), but filters work orders by string matching on `issue_date`.
   - **Deficiencies**: Lacks a dedicated interactive event grid (monthly/weekly/daily view), event creation for appointments/services, staff assignment selector, status filter, and dedicated DB table (`calendar_events`).

2. **`/whatsapp` (`src/app/(erp)/whatsapp/page.tsx`)**:
   - **Current Implementation**: Repurposes `documents` table with `type: 'whatsapp_log'` to simulate chat history.
   - **Line 204**: External image URL hardcoded: `bg-[url('https://i.ibb.co/3W6qWq9/wa-bg.png')]`.
   - **Lines 43-63**: `handleSendMessage` inserts a `whatsapp_log` document into `documents` with `status: 'invoiced'`.
   - **Deficiencies**: Not a real WhatsApp Web / CRM inbox interface. Lacks bidirectional message flow, active conversation list, customer tags, quick replies, status tracking, and dedicated DB tables (`whatsapp_conversations`, `whatsapp_messages`).

3. **`/integraciones` (`src/app/(erp)/integraciones/page.tsx`)**:
   - **Current Implementation**: Hardcoded array `AVAILABLE_INTEGRATIONS` (lines 9-31) containing Stripe, WhatsApp Business API, and Google Calendar.
   - **Lines 52-79**: Toggles enabled/disabled flag in `currentTenant.metadata.integrations` via `updateTenantSettings`.
   - **Deficiencies**: Static JSON cards without dynamic integration registry, credential/API key entry forms, webhook configuration, or DB storage for integration tokens.

4. **`/franquicias` (`src/app/(erp)/franquicias/page.tsx`)**:
   - **Current Implementation**: Queries `entities` with `type: 'branch'`.
   - **Line 51**: `topBranch` KPI hardcoded to `branches[0].name` without actual branch-level sales aggregation.
   - **Lines 149-152**: Simulated map view using inline SVG grid patterns.
   - **Deficiencies**: Lacks multi-branch sales performance comparison matrix, real-time tenant/branch switcher, consolidated financial views, and branch creation/management workflow.

5. **`/configuracion` (`src/app/(erp)/configuracion/page.tsx` & `/configuracion/plugins/page.tsx`)**:
   - **Current Implementation**: Updates `tenants.metadata` (name, currency, language, logo_url) via `updateTenantSettings`. `/configuracion/plugins` initializes `veTaxPlugin` via `pluginManager`.
   - **Deficiencies**: Lacks user-configurable tax settings (VAT rate, tax name, surcharge options) and exchange rate management UI.

6. **`/contabilidad` (`src/app/(erp)/contabilidad/page.tsx`)**:
   - **Current Implementation**: Renders `LegoEngine` with static `accountantDNA` layout.
   - **Lines 77-85**: Calculates "Ingresos Totales" and "Cuentas x Cobrar" by summing invoice `total_amount` from `documents`.
   - **Deficiencies**: Does not query `journal_entries` or `accounting_entries`. Lacks NIIF General Ledger (Libro Mayor), Trial Balance (Balance de Comprobación), Income Statement (Estado de Resultados), period filtering, and double-entry debit/credit validation.

7. **`/caja` (`src/app/(erp)/caja/page.tsx`)**:
   - **Current Implementation**: POS connected to Supabase via `processSecureCheckout`, `getItemsAction`, `getEntitiesAction`.
   - **Lines 91-92**: `const subtotal = ticketLines.reduce(...); const total = subtotal;` (Taxes computed server-side in `checkout.ts`).
   - **Line 106**: Fallback to `generic_counter_customer` when no entity selected.

8. **`/clientes`, `/catalogo`, `/compras`, `/equipo`**:
   - Integrated with `entities`, `items`, and `documents` tables via Server Actions. Uses optimistic UI state in React.
   - Requires UI refinement and fallback handling for missing metadata.

9. **`/admin` (`src/app/(saascore)/admin/page.tsx`, `billing`, `studio`)**:
   - Controls multi-tenant tenant activation/suspension (`toggleTenantStatus`).

### D. Hardcoded Tax and Fiscal Localizations (IGTF)
- **`src/lib/core/taxEngine.ts`**:
  - Lines 38-78: Hardcoded `switch (localizationCode)` for `'VE'`, `'MX'`, `'CO'`, `'US'`, `'INTL'`.
  - Lines 44-55: Hardcoded Venezuelan business rule: `IGTF` 3% surcharge applied when `paymentMethod === 'divisas'`.
- **`src/plugins/veTaxPlugin.ts`**:
  - Lines 20-28: Duplicates `IGTF` 3% surcharge for `paymentMethod === 'cash_usd'` and hardcodes `Control Fiscal SENIAT` UI widget.
- **`src/lib/core/plugins/pluginRegistry.ts`**:
  - Line 15: Automatically registers `veTaxPlugin` into `pluginManager` on startup.
- **`src/lib/core/accounting/chartOfAccounts.ts`**:
  - Line 41: Hardcodes `{ code: '2.1.02.02', name: 'Retenciones IGTF por Enterar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false }`.

---

## 2. Logic Chain

1. **Clean TypeScript Build**: Executing `npx tsc --noEmit` returns 0 errors, indicating that types, imports, and component interfaces are strictly typed across the project. Any refactoring must preserve this 0-error state.
2. **Server Actions vs Client State**: The project uses Server Actions in `src/app/actions/` backed by `supabaseAdmin` (service role) for privileged DB writes, while using `supabase` (anon client) for client-side state. However, modules `/calendario`, `/whatsapp`, `/contabilidad`, `/franquicias` currently reuse generic `documents` or `entities` tables instead of domain-specific tables and actions.
3. **Domain UI Mismatch**:
   - `/calendario` needs dedicated event data structure and interactive grid view (month/week) rather than treating work orders as calendar items.
   - `/whatsapp` needs a full chat inbox UI (conversations list, chat window, message composer, status tags) connected to dedicated chat tables.
   - `/contabilidad` needs financial accounting UI (General Ledger, Trial Balance, Income Statement) connected to `journal_entries` instead of a simplified Lego list of documents.
   - `/franquicias` needs multi-branch performance metrics and company/branch switching capabilities instead of a basic list of branch entities.
4. **Tax Neutrality**: Hardcoded IGTF and country-specific `switch` cases in `taxEngine.ts` violate multi-country SaaS flexibility. Replacing hardcoded rules with a tenant-configurable tax engine (`tenant.metadata.tax_config`: tax_name, rate, surcharges) will allow any business in any country to configure their local taxes (IVA, Sales Tax, VAT, or custom surcharges).

---

## 3. Caveats

- **Database Connection**: Tests were conducted against local source code and static analysis. Live database schema depends on executing SQL scripts (`migration_run.sql`, `production_auth.sql`, `multi_tenant.sql`) in Supabase.
- **Environment Variables**: Local environment lacks `.env.local`. Environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` must be configured in environment or `.env.local` for live database communication.

---

## 4. Conclusion

The SaaSCore ERP codebase possesses a solid TypeScript foundation (0 `tsc` errors) and an established Server Actions architecture with Supabase RLS. However, to complete the prompt requirements:
1. **Mock Data Eradication & Real DB Integration**: `/calendario`, `/whatsapp`, `/contabilidad`, and `/franquicias` must be upgraded from generic table repurposing or static JSON arrays to specialized domain interfaces connected via Server Actions and dedicated PostgreSQL/Supabase tables.
2. **Tax Engine Neutrality**: Hardcoded single-country tax logic (`IGTF` in `taxEngine.ts`, `veTaxPlugin.ts`, `chartOfAccounts.ts`) must be replaced with a neutral, tenant-configurable tax motor stored in tenant metadata or database settings.

---

## 5. Verification Method

To independently verify the findings in this report:

1. **Verify TypeScript Compilation**:
   ```cmd
   cmd /c "npx tsc --noEmit"
   ```
   *Expected result*: 0 errors.

2. **Inspect Supabase Clients & Server Actions**:
   - Check `src/lib/supabase.ts` and `src/lib/supabaseAdmin.ts`.
   - Inspect Server Action files in `src/app/actions/*.ts`.

3. **Inspect Tax Calculation Logic**:
   - View `src/lib/core/taxEngine.ts` (lines 38-78) for hardcoded `switch` statement and `IGTF` 3% surcharge.
   - View `src/plugins/veTaxPlugin.ts` (lines 20-28) for hardcoded `IGTF` 3% surcharge.
   - View `src/lib/core/accounting/chartOfAccounts.ts` (line 41) for hardcoded `Retenciones IGTF por Enterar`.

4. **Inspect Domain Modules**:
   - View `src/app/(erp)/calendario/page.tsx`
   - View `src/app/(erp)/whatsapp/page.tsx`
   - View `src/app/(erp)/contabilidad/page.tsx`
   - View `src/app/(erp)/franquicias/page.tsx`
   - View `src/app/(erp)/integraciones/page.tsx`
   - View `src/app/(erp)/configuracion/page.tsx`
