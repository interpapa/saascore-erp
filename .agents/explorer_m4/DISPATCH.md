## 2026-08-07T20:40:42Z
You are explorer_m4 (teamwork_preview_explorer).
Your task is to analyze and design the implementation strategy for Milestone 4: Specialized UI for `/contabilidad` (Libro Mayor & Balances NIIF).

Read the original user request at:
`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md`

Read the master project plan at:
`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\PROJECT.md`

Investigate existing files:
- `src/app/(erp)/contabilidad/page.tsx`
- `src/app/actions/accounting.ts`
- `src/types/accounting.ts`
- `src/lib/core/ledgerKernel.ts`
- `src/lib/core/chartOfAccounts.ts`

Objectives:
1. Audit current `/contabilidad/page.tsx` for any remaining hardcoded mock data or incomplete NIIF statement views.
2. Review server actions (`getJournalEntriesAction`, `getTrialBalanceAction`, `getIncomeStatementAction`, `createJournalEntryAction`) and fallback data structures (`documents` table with `type: 'journal_entry'`).
3. Plan modular component architecture in `src/components/contabilidad/`:
   - `AccountingKPIs.tsx`: Real-time financial metrics (Total Activos, Total Pasivos, Patrimonio, Utilidad Neta, Balanced Ledger status badge).
   - `AccountingFilters.tsx`: Period filter selector (`2026-Q1`, `2026-Q2`, `2026-FY`, etc.), tab navigation (`Libro Diario NIIF`, `Balance de Comprobación`, `Estado de Resultados`), and export action.
   - `GeneralJournalTable.tsx`: NIIF General Journal rendering `journal_entries` with Debit/Credit columns, account code, description, status badge, and balance indicator.
   - `TrialBalanceTable.tsx`: Trial Balance (Balance de Comprobación) table with initial balance, debit movement, credit movement, final balance, and footer validation row (Debit == Credit).
   - `IncomeStatementCard.tsx`: Income Statement (Estado de Resultados) card breakdown (Ingresos Operativos, Costos de Ventas, Margen Bruto, Gastos Operativos, Utilidad Neta).
4. Design state management flow for `src/app/(erp)/contabilidad/page.tsx`: dynamic period selection, tab switching, `useToast()` feedback, `<EmptyState>` fallbacks, and layout container `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.

Write your analysis and implementation strategy to `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_m4\handoff.md`. Send a message to parent orchestrator when complete.
