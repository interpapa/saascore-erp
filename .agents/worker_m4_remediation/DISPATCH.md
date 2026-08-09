## 2026-08-07T16:48:34-04:00
Working directory: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\worker_m4_remediation
Project Scope: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\PROJECT.md
Original Request: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md
Reviewer M4-2 Report: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\reviewer_m4_2\handoff.md

Task: Execute remediation for Milestone 4 (/contabilidad) read server actions security and tax label misnomer.

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Instructions:
1. In `src/app/actions/accounting.ts`:
   - Update `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` to accept `actor: KernelActor` (e.g. `(tenantId: string, filter?: FiscalPeriodFilter, actor: KernelActor = DEFAULT_ACTOR)` or required parameter).
   - Add security authorization and rate limiting calls at the top of each function:
     `checkRateLimit(actor.email, 'read');`
     `await validateKernelAccess(actor, tenantId, 'contabilidad');`
   - In line 196 (purchase document fallback synthesis), change the tax label description from `'Débito Fiscal IVA por Pagar'` to `'Crédito Fiscal IVA'` for purchase tax debit lines.

2. In `src/app/(erp)/contabilidad/page.tsx`:
   - Update all calls to `getJournalEntriesAction`, `getTrialBalanceAction`, and `getIncomeStatementAction` to pass `actor` (e.g. `currentActor` from session/state or default tenant actor).

3. In `src/__tests__/empirical_m1_test.ts` (if applicable):
   - Ensure all calls to these actions pass test actor so tests compile and run cleanly.

4. Technical Verification:
   - Run `cmd /c "npx tsc --noEmit"` and confirm zero TypeScript errors.

Deliver: handoff.md in `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\worker_m4_remediation\handoff.md`. Send completion message back to orchestrator.
