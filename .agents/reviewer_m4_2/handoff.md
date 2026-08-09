# Milestone 4 Code Review B Report: Specialized UI for `/contabilidad`

## 1. Observation

### Implementation & Verification Overview
- **TypeScript Compiler Check**: `cmd /c "npx tsc --noEmit"` executed successfully with **0 errors**.
- **Double-Entry Modal (`src/components/contabilidad/CreateJournalEntryModal.tsx`)**:
  - Implements real-time calculation of `totalDebit`, `totalCredit`, and `difference`.
  - Enforces `isBalanced = difference < 0.01 && totalDebit > 0` and requires non-empty description.
  - Automatically resets opposite entry (debit/credit) on the same line when typing numbers.
  - Prevents dropping below 2 line items (`lines.length <= 2` disables removal).
  - Backed by immutable server kernel check `createKernelJournalEntry` in `src/lib/core/kernel/ledgerKernel.ts` which throws if `Math.abs(totalDebit - totalCredit) > 0.01`.
- **Account Hierarchy & Margin Computations**:
  - `TrialBalanceTable.tsx` indents account rows based on `level` (`(level - 1) * 16px`), highlights `isHeader` nodes, and excludes `isHeader` nodes from total balance computations to prevent double-counting.
  - `IncomeStatementCard.tsx` groups rows by account code prefixes (`4.1` revenue, `4.2` other income/fx, `5.1` cost of sales, `5.2` operating expenses) and accurately computes Gross Profit, Operating Profit, Net Profit, Gross Margin %, and Net Margin %.
- **Server Action Rate Limiting & Security Permissions (`src/app/actions/accounting.ts`)**:
  - `createJournalEntryAction`, `getAgingReportAction`, `getChartOfAccountsAction`, and `runFXRevaluationAction` correctly implement `checkRateLimit(actor.email, ...)` and `await validateKernelAccess(actor, tenantId, 'contabilidad')`.
  - **CRITICAL DEFECT OBSERVED**: Functions `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` in `src/app/actions/accounting.ts` **DO NOT** accept `actor: KernelActor`, **DO NOT** invoke `checkRateLimit`, and **DO NOT** invoke `validateKernelAccess(actor, tenantId, 'contabilidad')`.

---

## 2. Review Summary

**Verdict**: **REQUEST_CHANGES**

### Findings

#### [Critical] Finding 1: Security & Multi-Tenant Access Control Bypass on Financial Read Server Actions
- **What**: Functions `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` in `src/app/actions/accounting.ts` do not accept an `actor: KernelActor` parameter and do not perform tenant authorization (`validateKernelAccess`) or rate limiting (`checkRateLimit`).
- **Where**:
  - `src/app/actions/accounting.ts` (lines 86-90, 262-266, 337-341)
  - `src/app/(erp)/contabilidad/page.tsx` (lines 58-62)
  - `src/__tests__/empirical_m1_test.ts` (lines 179, 202, 210)
- **Why**: In Next.js, any exported function from a file marked with `'use server'` is exposed as a public RPC HTTP endpoint. Because these read functions execute `supabaseAdmin` queries filtered only by the provided `tenantId: string` parameter without verifying the caller's identity or tenant access rights:
  1. An attacker or client can invoke `getJournalEntriesAction("any-tenant-id")`, `getTrialBalanceAction("any-tenant-id")`, or `getIncomeStatementAction("any-tenant-id")` directly to exfiltrate confidential ledger entries, trial balances, and net profit figures for any tenant on the system.
  2. The mandatory RBAC permission check for `'contabilidad'` is bypassed for read operations.
  3. No rate limiting is enforced for financial queries.
- **Suggestion**:
  1. Modify `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` in `src/app/actions/accounting.ts` to accept `actor: KernelActor` as a parameter.
  2. Add `checkRateLimit(actor.email, 'read')` and `await validateKernelAccess(actor, tenantId, 'contabilidad')` at the beginning of each action function.
  3. Update `ContabilidadPage` in `src/app/(erp)/contabilidad/page.tsx` to pass `actor` when calling these 3 server actions.
  4. Update test calls in `src/__tests__/empirical_m1_test.ts` to pass test actor.

#### [Minor] Finding 2: Label Misnomer in Purchase Tax Fallback Synthesis
- **What**: In `getJournalEntriesAction` document synthesis fallback (line 196), tax on purchase documents (`doc.type === 'purchase'`) assigns account `'2.1.02.01'` the description `'Débito Fiscal IVA por Pagar'` when generating debit tax lines.
- **Where**: `src/app/actions/accounting.ts` line 196.
- **Why**: Tax paid on purchases is tax credit (Crédito Fiscal IVA). Assigning the label `'Débito Fiscal IVA por Pagar'` to a purchase tax line causes minor descriptive confusion in fallback journal entry lines.
- **Suggestion**: Use `'Crédito Fiscal IVA'` or appropriate tax credit label when synthesizing purchase entries.

---

## 3. Verified Claims

- **TypeScript Compilation (`cmd /c "npx tsc --noEmit"`)**: Verified 0 errors. -> **PASS**
- **Double-Entry Validation (`CreateJournalEntryModal.tsx`)**: Real-time balance validation (`Math.abs(totalDebit - totalCredit) < 0.01` and `totalDebit > 0`), clear UI indicators, and minimum 2 lines requirement. -> **PASS**
- **Account Hierarchy Rendering (`TrialBalanceTable.tsx`)**: Indentation via `level`, formatting for `isHeader` rows, and non-header total aggregation. -> **PASS**
- **Margin Calculations (`IncomeStatementCard.tsx`)**: Correct formula calculations for Gross Profit (`Revenue - CostOfSales`), Operating Profit (`GrossProfit - OperatingExpenses`), Net Profit (`OperatingProfit + OtherIncome`), Gross Margin %, and Net Margin %. -> **PASS**
- **Kernel Ledger Immutability (`ledgerKernel.ts`)**: Double-entry enforcement and rollback on failed line insertions. -> **PASS**

---

## 4. Coverage Gaps

- Unprotected read server actions (`getJournalEntriesAction`, `getTrialBalanceAction`, `getIncomeStatementAction`) represent a **HIGH** multi-tenant security vulnerability that must be resolved prior to milestone sign-off.

---

## 5. Logic Chain

1. **Observation**: `accounting.ts` has `'use server'` at top level. Functions `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` accept `(tenantId: string, filter?: FiscalPeriodFilter)`.
2. **Analysis**: In Next.js App Router, functions exported from `'use server'` files are publicly callable endpoints over HTTP POST. They use `supabaseAdmin` which bypasses Supabase RLS. Without calling `validateKernelAccess(actor, tenantId, 'contabilidad')` or `checkRateLimit(actor.email, 'read')`, any user can pass arbitrary tenant IDs and retrieve complete financial ledgers.
3. **Conclusion**: This violates tenant security and permission constraints of the SaaSCore ERP kernel. Verdict must be **REQUEST_CHANGES**.

---

## 6. Stress Test Results

- **Scenario 1: Direct invocation of `getJournalEntriesAction("target_tenant_id")` without auth context**
  - Expected: Action rejects call with security authorization error.
  - Actual: Action executes `supabaseAdmin` query and returns full journal entries of target tenant. -> **FAIL** (Vulnerability confirmed)
- **Scenario 2: Create manual journal entry with unbalanced amounts (Debit $500, Credit $300)**
  - Expected: Modal disables submit button and displays desbalance alert with difference $200.00.
  - Actual: Submit button is disabled (`isValid = false`), warning banner displays `Desbalance Detectado: Diferencia de $200.00`. -> **PASS**
- **Scenario 3: Create manual journal entry with 1 line item**
  - Expected: System requires at least 2 line items.
  - Actual: Default modal initializes 2 line items and trash button is disabled (`lines.length <= 2`). -> **PASS**

---

## 7. Caveats

No caveats. All files and security patterns were directly inspected and verified against project standards.

---

## 8. Conclusion

Worker M4 has delivered a visually complete and well-structured UI suite for `/contabilidad` with strong double-entry modal validation, hierarchical trial balance rendering, and detailed income statement cards. However, **`getJournalEntriesAction`**, **`getTrialBalanceAction`**, and **`getIncomeStatementAction`** in `src/app/actions/accounting.ts` omit `actor: KernelActor`, `checkRateLimit`, and `validateKernelAccess`, creating a critical multi-tenant data leak vulnerability.

**Verdict**: **REQUEST_CHANGES**

---

## 9. Verification Method

To verify the requested changes after Worker M4 updates the code:
1. Run `cmd /c "npx tsc --noEmit"` and confirm 0 compilation errors.
2. Inspect `src/app/actions/accounting.ts` and confirm that `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` accept `actor: KernelActor`, call `checkRateLimit(actor.email, 'read')`, and call `await validateKernelAccess(actor, tenantId, 'contabilidad')`.
3. Inspect `src/app/(erp)/contabilidad/page.tsx` and `src/__tests__/empirical_m1_test.ts` to confirm `actor` is passed to all 3 action calls.
