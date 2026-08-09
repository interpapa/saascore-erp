# Handoff Report — Milestone 1: Server Actions & Types Layer for `/contabilidad` & `/franquicias`

**Author**: `teamwork_preview_explorer` (Explorer M1-3)  
**Date**: 2026-08-07  
**Working Directory**: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_m1_3`  
**Target Milestone**: M1 (Server Actions & Types Layer for accounting and enterprise)

---

## 1. Observation

Direct observations from auditing the codebase:
- **`src/types/`**: Currently only contains `lego.ts`. Standard domain types for accounting (`src/types/accounting.ts`) and multi-branch enterprise (`src/types/enterprise.ts`) are missing.
- **`src/app/actions/accounting.ts`**: Contains aging reports (`getAgingReportAction`), chart of accounts (`getChartOfAccountsAction`), and FX revaluation (`runFXRevaluationAction`). Does **not** yet export `getJournalEntriesAction`, `getTrialBalanceAction`, or `getIncomeStatementAction`.
- **`src/app/actions/enterprise.ts`**: Contains CSV import (`processCSVImportAction`), webhook registration (`registerWebhookAction`), and impersonation (`startImpersonationAction`). Does **not** yet export `getBranchPerformanceAction` or `getTenantBranchesAction`.
- **`src/lib/core/kernel/ledgerKernel.ts`**: Implements double-entry NIIF validation and writes to `journal_entries` and `journal_entry_lines` tables via `supabaseAdmin`.
- **`src/lib/core/accounting/chartOfAccounts.ts`**: Defines `DEFAULT_CHART_OF_ACCOUNTS` (`AccountNode[]`) covering NIIF Classes 1 (Activo), 2 (Pasivo), 3 (Patrimonio), 4 (Ingresos), and 5 (Gastos).
- **`src/lib/api/entities.ts`**: Defines `Entity` where branch entities have `type: 'branch'`.
- **`src/lib/api/documents.ts`**: Defines `Document` with status fields (`invoiced`, `paid`, `draft`, etc.) and amounts (`subtotal_amount`, `tax_amount`, `total_amount`).
- **`src/app/(erp)/contabilidad/page.tsx`**: Uses `LegoEngine` reading directly from `getDocumentsAction`, lacking proper NIIF journal entry visualization and Trial Balance / Income Statement data structures.
- **`src/app/(erp)/franquicias/page.tsx`**: Uses `getEntitiesAction(tenantId, 'branch')` and `getDocumentsAction(tenantId, 'invoice')`, needing dedicated Server Actions for branch metrics and sales aggregation.

---

## 2. Logic Chain

### Step 1: Create Domain Type Definitions
1. **`src/types/accounting.ts`**:
   - `FiscalPeriodFilter`: Period range filtering (`startDate`, `endDate`, `preset`, `status`).
   - `Account`: Chart of accounts node (`code`, `name`, `type`, `level`, `parentCode`, `isHeader`, `balance`).
   - `JournalLine`: Individual debit/credit record (`id`, `journal_entry_id`, `account_code`, `account_name`, `debit`, `credit`, `description`).
   - `JournalEntry`: General Journal header and lines (`id`, `tenant_id`, `document_id`, `entry_number`, `entry_date`, `description`, `total_debit`, `total_credit`, `status`, `lines`, `created_at`).
   - `TrialBalanceRow`: Row for Balance de Comprobación (`account_code`, `account_name`, `account_type`, `initial_debit`, `initial_credit`, `period_debit`, `period_credit`, `final_debit`, `final_credit`, `isHeader`, `level`).
   - `IncomeStatementReport`: Formatted Estado de Resultados (`period`, `revenue`, `costOfSales`, `grossProfit`, `operatingExpenses`, `operatingProfit`, `otherIncomeExpenses`, `netProfit`).
   - Result wrappers (`JournalEntriesResult`, `TrialBalanceResult`, `IncomeStatementResult`).

2. **`src/types/enterprise.ts`**:
   - `TenantBranch`: Standardized branch entity model (`id`, `tenant_id`, `name`, `code`, `address`, `phone`, `tax_id`, `manager_name`, `manager_email`, `status`, `metadata`, `created_at`, `updated_at`).
   - `BranchSalesMetrics`: Metrics model (`branch_id`, `branch_name`, `total_revenue`, `total_invoices`, `average_ticket`, `pending_receivables`, `active_customers`).
   - `BranchPerformance`: Combined branch detail + metrics + growth indicators (`branch`, `metrics`, `growth_rate_pct`, `status_label`).
   - Result wrappers (`TenantBranchesResult`, `BranchPerformanceResult`).

### Step 2: Implement Accounting Server Actions (`src/app/actions/accounting.ts`)
1. **`getJournalEntriesAction(tenantId: string, filter?: FiscalPeriodFilter)`**:
   - Query `journal_entries` table joined with `journal_entry_lines` for `tenant_id`.
   - Apply date filtering if `filter.startDate` or `filter.endDate` are specified.
   - **Fallback Strategy**: If `journal_entries` table returns 0 records for tenant/period:
     - Fetch sales/purchase/payroll documents from `documents`.
     - Synthesize NIIF double-entry `JournalEntry` objects on-the-fly:
       - Invoice: Debit `1.1.02.01` (Clientes), Credit `4.1.01` (Ingresos), Credit `2.1.02.01` (IVA Pagar).
       - Purchase: Debit `5.1` (Costo Ventas), Debit `2.1.02.01` (IVA Crédito), Credit `2.1.01.01` (Proveedores).
       - Payroll: Debit `5.2.01` (Sueldos), Credit `1.1.01.02` (Bancos).
     - Assert Debit === Credit balancing for every generated entry (`abs(totalDebit - totalCredit) <= 0.01`).
   - Return `{ success: true, data: JournalEntry[] }`.

2. **`getTrialBalanceAction(tenantId: string, filter?: FiscalPeriodFilter)`**:
   - Call `getJournalEntriesAction` to retrieve all valid entries.
   - Group entries by `account_code`.
   - Sum `period_debit` and `period_credit` per account code.
   - Determine net ending balance (`final_debit` vs `final_credit`) based on normal account balance:
     - Asset/Expense: Debit balance = `debit - credit`.
     - Liability/Equity/Revenue: Credit balance = `credit - debit`.
   - Merge with `DEFAULT_CHART_OF_ACCOUNTS` so all NIIF account headers and sub-accounts are represented.
   - Compute grand totals (`totalDebit`, `totalCredit`).
   - Return `{ success: true, data: TrialBalanceRow[], totals: { debit, credit } }`.

3. **`getIncomeStatementAction(tenantId: string, filter?: FiscalPeriodFilter)`**:
   - Retrieve trial balance / period movement for Class 4 (Ingresos) and Class 5 (Gastos).
   - Categorize accounts into Revenue (`4.1`), Cost of Sales (`5.1`), Operating Expenses (`5.2`), and Other Income/Expenses (`4.2`).
   - Calculate key financial indicators:
     - `grossProfit = totalRevenue - costOfSales`
     - `operatingProfit = grossProfit - operatingExpenses`
     - `netProfit = operatingProfit + otherIncomeExpenses`
   - Return `{ success: true, data: IncomeStatementReport }`.

### Step 3: Implement Enterprise Server Actions (`src/app/actions/enterprise.ts`)
1. **`getTenantBranchesAction(tenantId: string)`**:
   - Query `entities` where `type = 'branch'` and (`tenant_id = tenantId` or `tenant_id is null`).
   - Transform rows into `TenantBranch[]` format.
   - Return `{ success: true, data: TenantBranch[] }`.

2. **`getBranchPerformanceAction(tenantId: string)`**:
   - Retrieve all branch entities via `getTenantBranchesAction`.
   - Retrieve invoices from `documents` table for `tenant_id`.
   - Map invoices to corresponding branches (matching `entity_id === branch.id` or `metadata.branch_id === branch.id`).
   - Calculate aggregated metrics per branch (`total_revenue`, `total_invoices`, `average_ticket`, `pending_receivables`, `active_customers`).
   - Calculate network wide KPIs (`globalRevenue`, `activeBranches`, `topBranchName`).
   - Return `{ success: true, data: BranchPerformance[], globalMetrics }`.

---

## 3. Exact Code Signatures

### File 1: `src/types/accounting.ts`
```typescript
export interface FiscalPeriodFilter {
  startDate?: string;
  endDate?: string;
  preset?: 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
  status?: 'posted' | 'draft' | 'all';
}

export interface Account {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  level: number;
  parentCode?: string;
  isHeader: boolean;
  balance?: number;
}

export interface JournalLine {
  id?: string;
  journal_entry_id?: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  document_id?: string | null;
  entry_number?: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'posted' | 'draft' | 'annulled';
  lines: JournalLine[];
  created_at?: string;
  source_document_ref?: string;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  initial_debit: number;
  initial_credit: number;
  period_debit: number;
  period_credit: number;
  final_debit: number;
  final_credit: number;
  isHeader?: boolean;
  level?: number;
}

export interface IncomeStatementReport {
  period: FiscalPeriodFilter;
  revenue: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  costOfSales: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  operatingProfit: number;
  otherIncomeExpenses: {
    rows: Array<{ code: string; name: string; amount: number }>;
    total: number;
  };
  netProfit: number;
}

export interface JournalEntriesResult {
  success: boolean;
  data?: JournalEntry[];
  error?: string;
  totalCount?: number;
}

export interface TrialBalanceResult {
  success: boolean;
  data?: TrialBalanceRow[];
  totals?: { debit: number; credit: number };
  error?: string;
}

export interface IncomeStatementResult {
  success: boolean;
  data?: IncomeStatementReport;
  error?: string;
}
```

### File 2: `src/app/actions/accounting.ts`
```typescript
'use server';

import {
  FiscalPeriodFilter,
  JournalEntry,
  JournalEntriesResult,
  TrialBalanceResult,
  IncomeStatementResult
} from '@/types/accounting';

export async function getJournalEntriesAction(
  tenantId: string,
  filter?: FiscalPeriodFilter
): Promise<JournalEntriesResult>;

export async function getTrialBalanceAction(
  tenantId: string,
  filter?: FiscalPeriodFilter
): Promise<TrialBalanceResult>;

export async function getIncomeStatementAction(
  tenantId: string,
  filter?: FiscalPeriodFilter
): Promise<IncomeStatementResult>;
```

### File 3: `src/types/enterprise.ts`
```typescript
export interface TenantBranch {
  id: string;
  tenant_id: string | null;
  name: string;
  code?: string;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  manager_name: string | null;
  manager_email?: string | null;
  status: 'active' | 'inactive' | 'pending';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BranchSalesMetrics {
  branch_id: string;
  branch_name: string;
  total_revenue: number;
  total_invoices: number;
  average_ticket: number;
  pending_receivables: number;
  active_customers: number;
  period?: string;
}

export interface BranchPerformance {
  branch: TenantBranch;
  metrics: BranchSalesMetrics;
  growth_rate_pct: number;
  status_label: 'Excelente' | 'Normal' | 'Atención';
}

export interface TenantBranchesResult {
  success: boolean;
  data?: TenantBranch[];
  error?: string;
}

export interface BranchPerformanceResult {
  success: boolean;
  data?: BranchPerformance[];
  globalMetrics?: {
    totalRevenue: number;
    activeBranches: number;
    topBranchName: string;
  };
  error?: string;
}
```

### File 4: `src/app/actions/enterprise.ts`
```typescript
'use server';

import {
  TenantBranch,
  TenantBranchesResult,
  BranchPerformanceResult
} from '@/types/enterprise';

export async function getTenantBranchesAction(
  tenantId: string
): Promise<TenantBranchesResult>;

export async function getBranchPerformanceAction(
  tenantId: string
): Promise<BranchPerformanceResult>;
```

---

## 4. Caveats

1. **Dual-Path Data Resolution for Journal Entries**:  
   If `journal_entries` table has not yet been populated by explicit triggers/actions for a given tenant, the fallback dynamically synthesizes balanced NIIF entries from `documents`. This ensures UI components for `/contabilidad` won't crash or render blank tables.
2. **Branch Entity Association**:  
   `documents` items link to branches either through `entity_id` (if branch entity is specified) or via `metadata.branch_id`. If neither is populated, sales default to the main tenant headquarters.
3. **Double Entry Balancing Rule**:  
   The fallback engine must enforce `abs(totalDebit - totalCredit) <= 0.01` for every synthesized journal entry. Any unbalanced entry will raise a warning and adjust rounding to ensure total NIIF integrity.

---

## 5. Conclusion & Next Steps

This strategy bridges database models and the frontend UI components for `/contabilidad` and `/franquicias`.

**Actionable next steps for Implementer agent**:
1. Write `src/types/accounting.ts` with all specified interfaces.
2. Write `src/types/enterprise.ts` with all specified interfaces.
3. Extend `src/app/actions/accounting.ts` implementing `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` with fallback synthesis.
4. Extend `src/app/actions/enterprise.ts` implementing `getBranchPerformanceAction` and `getTenantBranchesAction`.
5. Run `cmd /c "npx tsc --noEmit"` to verify compilation.

---

## 6. Verification Method

- Run `cmd /c "npx tsc --noEmit"` to verify zero compilation errors.
- Test exported signatures against `src/app/(erp)/contabilidad/page.tsx` and `src/app/(erp)/franquicias/page.tsx`.
