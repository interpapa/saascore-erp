## 2026-08-07T16:41:49Z
You are worker_m4 (teamwork_preview_worker).
Your task is to implement Milestone 4: Specialized UI for `/contabilidad` (Libro Mayor & Balances NIIF).

Read the original user request at:
`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md`

Read Explorer M4's handoff report at:
`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_m4\handoff.md`

Implementation Tasks:
1. Update `src/app/actions/accounting.ts`:
   - Add `createJournalEntryAction(payload, tenantId, actor)` wrapping `createKernelJournalEntry`.
2. Create modular UI components in `src/components/contabilidad/`:
   - `AccountingKPIs.tsx`: Real-time financial summary metrics (Total Activos, Total Pasivos, Patrimonio, Utilidad Neta, NIIF Balanced Ledger status badge).
   - `AccountingFilters.tsx`: Period filter selector (`2026-Q1`, `2026-Q2`, `2026-FY`, etc.), tab navigation switcher (`journal`, `trial_balance`, `income_statement`), export action, and new entry CTA.
   - `GeneralJournalTable.tsx`: NIIF General Journal rendering `journal_entries` with expandable line items, debit/credit columns, and balance check badge.
   - `TrialBalanceTable.tsx`: Trial Balance (Balance de Comprobación) table with account hierarchy indentation, period debit/credit movements, final balances, and footer validation row (Total Debit == Total Credit).
   - `IncomeStatementCard.tsx`: Income Statement (Estado de Resultados) card breakdown (Ingresos Operativos, Costos de Ventas, Margen Bruto, Gastos, Utilidad Neta).
   - `CreateJournalEntryModal.tsx`: Interactive modal dialog to create manual double-entry NIIF journal entries with real-time balancing validation.
3. Refactor `src/app/(erp)/contabilidad/page.tsx`:
   - Eradicate legacy `LegoEngine` / `accountantDNA` and generic document queries.
   - Connect directly to server actions (`getJournalEntriesAction`, `getTrialBalanceAction`, `getIncomeStatementAction`, `createJournalEntryAction`).
   - Implement period filtering, tab navigation, optimistic entry creation, `useToast()` feedback, and layout container `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification:
Execute `cmd /c "npx tsc --noEmit"` and confirm 0 compilation errors.

Write your handoff report to `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\worker_m4\handoff.md` and send a message to parent orchestrator when complete.
