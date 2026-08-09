## 2026-08-07T11:38:21Z
Objective:
Design the implementation strategy for Milestone 1: Server Actions & Types Layer for `/contabilidad` and `/franquicias`.

Mandatory Inputs to Read:
- `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\PROJECT.md`

Scope:
- Design `src/types/accounting.ts` (JournalEntry, JournalLine, Account, TrialBalanceRow, IncomeStatementReport, FiscalPeriodFilter).
- Design `src/app/actions/accounting.ts` (`getJournalEntriesAction`, `getTrialBalanceAction`, `getIncomeStatementAction`) querying `journal_entries` / `journal_entry_lines` (or fallback generation from `documents` with Debit/Credit balancing).
- Design `src/types/enterprise.ts` (BranchPerformance, BranchSalesMetrics, TenantBranch).
- Design `src/app/actions/enterprise.ts` (`getBranchPerformanceAction`, `getTenantBranchesAction`) aggregating revenue per branch entity.

Output:
Write your step-by-step implementation strategy and exact code signatures to `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_m1_3\handoff.md`.
Send a summary message back to parent orchestrator.
