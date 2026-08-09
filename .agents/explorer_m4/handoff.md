# Milestone 4 Handoff Report & Implementation Strategy: Specialized UI for `/contabilidad` (Libro Mayor & Balances NIIF)

## 1. Observation

### Current Implementation Audit (`src/app/(erp)/contabilidad/page.tsx`)
- **Lego Engine Dependency**: Currently, `page.tsx` uses `LegoEngine` with a generic module DNA (`accountantDNA`, lines 10-44).
- **Generic Document Query**: It fetches general documents via `getDocumentsAction` (line 63) instead of using the NIIF accounting kernel actions.
- **Calculations**: Basic client-side math is performed on generic operational documents (lines 77-85: `ingresosTotales`, `cuentasPorCobrar`, `totalAsientos`) rather than querying NIIF double-entry balances.
- **Missing Domain Views**: Does not render a General Journal (Libro Diario NIIF), Trial Balance (Balance de Comprobación), or Income Statement (Estado de Resultados).
- **Missing Filters & Interactivity**: Lacks fiscal period selector (`2026-Q1`, `2026-FY`, etc.), tab navigation between NIIF statements, export actions, and manual entry creation.

### Server Actions & Domain Infrastructure Audit (`src/app/actions/accounting.ts`)
- **`getJournalEntriesAction(tenantId, filter)`**:
  - Primary query: Selects from `journal_entries` joined with `journal_entry_lines`.
  - Fallback synthesis: If `journal_entries` table is missing or empty, automatically synthesizes NIIF Journal Entries directly from `documents` (invoices, sales, purchases) with balanced Debit and Credit lines (lines 136-249).
- **`getTrialBalanceAction(tenantId, filter)`**:
  - Aggregates journal entry movements against `DEFAULT_CHART_OF_ACCOUNTS` (lines 261-331).
  - Returns `TrialBalanceRow[]` with initial balances, period debit/credit movements, final balances, and totals.
- **`getIncomeStatementAction(tenantId, filter)`**:
  - Processes accounts starting with `4.1` (operational revenue), `4.2` (other income/FX gain), `5.1` (cost of sales), and `5.2` (operating expenses).
  - Returns `IncomeStatementReport` with gross profit, operating profit, and net profit (lines 336-406).
- **Action Gap**:
  - Missing `createJournalEntryAction` wrapper in `accounting.ts` to connect to `createKernelJournalEntry(payload)` from `src/lib/core/kernel/ledgerKernel.ts` for posting manual NIIF journal entries.

### Type Definitions (`src/types/accounting.ts`)
- Complete TypeScript contracts exist for `FiscalPeriodFilter`, `Account`, `JournalLine`, `JournalEntry`, `TrialBalanceRow`, `IncomeStatementReport`, `JournalEntriesResult`, `TrialBalanceResult`, `IncomeStatementResult`.

### Accounting Kernel (`src/lib/core/kernel/ledgerKernel.ts`)
- `createKernelJournalEntry(payload)` enforces strict double-entry NIIF validation: `Math.abs(totalDebit - totalCredit) > 0.01` (lines 31-33).

### Chart of Accounts (`src/lib/core/accounting/chartOfAccounts.ts`)
- `DEFAULT_CHART_OF_ACCOUNTS` defines a 4-level hierarchical NIIF chart (Activos, Pasivos, Patrimonio, Ingresos, Gastos).

### Component Directory
- `src/components/contabilidad/` directory does NOT exist yet.

---

## 2. Logic Chain

1. **Problem**: `/contabilidad/page.tsx` is using generic Lego components that bypass the NIIF double-entry accounting kernel (`ledgerKernel.ts` and `accounting.ts`), failing Requirement R2 and Milestone 4 goals.
2. **Solution Strategy**: Rebuild `/contabilidad/page.tsx` following the proven modular architecture of `/calendario` (M2) and `/whatsapp` (M3).
3. **Data Layer Integration**: Wire `page.tsx` to `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction`. Add `createJournalEntryAction` to `src/app/actions/accounting.ts` to support manual entry creation.
4. **UI Componentization**: Build 6 dedicated modular components in `src/components/contabilidad/`:
   - `AccountingKPIs.tsx`: Financial summary metrics + NIIF Balanced Ledger indicator.
   - `AccountingFilters.tsx`: Period filter selector, tab navigation switcher, export button, and new entry CTA.
   - `GeneralJournalTable.tsx`: NIIF General Journal rendering `JournalEntry[]` with expandable line items and debit/credit balance checks.
   - `TrialBalanceTable.tsx`: Trial Balance (Balance de Comprobación) table with account hierarchy indentation, period movements, final balances, and footer validation row (Total Debit == Total Credit).
   - `IncomeStatementCard.tsx`: Income Statement (Estado de Resultados) breakdown card (Ingresos, Costos, Margen Bruto, Gastos, Utilidad Neta).
   - `CreateJournalEntryModal.tsx`: Interactive modal to create manual double-entry journal entries with real-time balancing validation.
5. **State Management & UX**: Use `useTenantResolver()`, `useERPStore()`, `useToast()`, `Promise.all` for parallel fetching, period state, tab switching (`journal` | `trial_balance` | `income_statement`), and `<EmptyState>` fallbacks.

---

## 3. Caveats

- **Fallback Synthesis**: When `journal_entries` table in Supabase has no records, `getJournalEntriesAction` synthesizes entries from `documents` (invoices, sales, purchases). The UI must handle both native `journal_entries` and synthesized document entries seamlessly.
- **Chart of Accounts Hierarchy**: `DEFAULT_CHART_OF_ACCOUNTS` contains header nodes (`isHeader: true`) and auxiliary accounts (`isHeader: false`). Visual formatting in `TrialBalanceTable` must clearly distinguish header rows from imputable sub-accounts using indentation (`level * 12px`).

---

## 4. Conclusion & Implementation Blueprint

### Step 1: Add `createJournalEntryAction` to `src/app/actions/accounting.ts`
Wrap `createKernelJournalEntry` to allow manual journal entry creation from server action with authorization validation:
```ts
export async function createJournalEntryAction(
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
  actor: { email: string; role: string }
)
```

### Step 2: Create `src/components/contabilidad/AccountingKPIs.tsx`
Display 5 key metrics:
- **Total Activos**: Sum of final asset account balances.
- **Total Pasivos**: Sum of final liability account balances.
- **Patrimonio**: Total equity balance.
- **Utilidad Neta**: Net profit from Income Statement.
- **Estado Libro NIIF**: Status badge indicating "Asientos Balanceados (NIIF Ok)" in green when Total Debit == Total Credit, or "Desbalance Detectado" in amber if unequal.

### Step 3: Create `src/components/contabilidad/AccountingFilters.tsx`
- Period Dropdown: `2026-Q1`, `2026-Q2`, `2026-Q3`, `2026-Q4`, `2026-FY`, `this_month`, `last_month`, `all`.
- Tab Switcher:
  - `journal`: "Libro Diario NIIF"
  - `trial_balance`: "Balance de Comprobación"
  - `income_statement`: "Estado de Resultados"
- Action buttons: "Exportar Informe" (triggers CSV download or print view) and "Nuevo Asiento Manual" (opens creation modal).

### Step 4: Create `src/components/contabilidad/GeneralJournalTable.tsx`
- Renders `JournalEntry[]` with entry number, date, description, document reference, total debit, total credit, status badge (`posted`, `draft`, `annulled`), and NIIF balance check badge (`Débitos = Créditos`).
- Expandable line items showing `account_code`, `account_name`, `debit`, `credit`, and line description.
- Search input and status filter.
- `<EmptyState>` fallback when no entries exist.

### Step 5: Create `src/components/contabilidad/TrialBalanceTable.tsx`
- Renders `TrialBalanceRow[]` following `DEFAULT_CHART_OF_ACCOUNTS`.
- Columns: Código, Nombre de Cuenta, Tipo, Saldo Inicial, Movimiento Débito, Movimiento Crédito, Saldo Final Débito, Saldo Final Crédito.
- Level-based indentation (`level` 1-4) and font weight styling for header accounts (`isHeader`).
- Footer validation row displaying Total Débitos, Total Créditos, and Balance Validation status ("Partida Doble Cuadrada").
- Account search filter and `<EmptyState>` fallback.

### Step 6: Create `src/components/contabilidad/IncomeStatementCard.tsx`
- Structured card breakdown for Income Statement:
  - Ingresos Operacionales (Ventas, Servicios)
  - Costos de Ventas
  - Margen Bruto (Highlight & Percentage)
  - Gastos Operativos y Administrativos (Sueldos, Servicios, etc.)
  - Utilidad Operativa
  - Otros Ingresos/Gastos (Ganancia/Pérdida en cambio)
  - Utilidad Neta (Green for profit, Red for loss)
- `<EmptyState>` fallback.

### Step 7: Create `src/components/contabilidad/CreateJournalEntryModal.tsx`
- Modal dialog with form fields: Entry Date, Description, and dynamic line items.
- Dynamic line item table: Account Code selector (from `DEFAULT_CHART_OF_ACCOUNTS`), Line Description, Debit Amount, Credit Amount.
- Real-time balance calculator showing Total Debit vs Total Credit and difference.
- Submit button disabled if unbalanced or total debit == 0.

### Step 8: Refactor `src/app/(erp)/contabilidad/page.tsx`
- Main page container: `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.
- Connects state for active tab, period filter, journal entries, trial balance, income statement, loading, modal state.
- Loads data in parallel with `Promise.all([getJournalEntriesAction(...), getTrialBalanceAction(...), getIncomeStatementAction(...)])`.
- Shows Toast feedback for errors and actions.
- Integrates `AccountingKPIs`, `AccountingFilters`, `GeneralJournalTable`, `TrialBalanceTable`, `IncomeStatementCard`, and `CreateJournalEntryModal`.

---

## 5. Verification Method

1. **TypeScript Verification**:
   Execute:
   ```cmd
   cmd /c "npx tsc --noEmit"
   ```
   Ensure 0 errors.

2. **File Structure Inspection**:
   Verify new files exist in:
   - `src/components/contabilidad/AccountingKPIs.tsx`
   - `src/components/contabilidad/AccountingFilters.tsx`
   - `src/components/contabilidad/GeneralJournalTable.tsx`
   - `src/components/contabilidad/TrialBalanceTable.tsx`
   - `src/components/contabilidad/IncomeStatementCard.tsx`
   - `src/components/contabilidad/CreateJournalEntryModal.tsx`

3. **Data Flow & UI Verification**:
   - Verify `page.tsx` no longer imports `LegoEngine` or `accountantDNA`.
   - Verify tab switching renders General Journal, Trial Balance, and Income Statement correctly.
   - Verify period filtering triggers re-fetch with updated filter parameters.
   - Verify toast notifications appear on action execution.
