# BRIEFING — 2026-08-07T11:38:00Z

## Mission
Comprehensive audit and inventory of mock data, Supabase client/Server Actions setup, fiscal/tax localizations (IGTF), and TypeScript build status in SaaSCore ERP.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, auditor, investigator
- Working directory: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_survey_1
- Original parent: 26977d3a-60cc-4354-9371-d200e74ba403
- Milestone: codebase_audit_and_mock_inventory

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code changes in `src/`
- Audit mock data across `/calendario`, `/whatsapp`, `/integraciones`, `/franquicias`, `/configuracion`, `/contabilidad`, `/caja`, `/clientes`, `/catalogo`, `/compras`, `/equipo`, `/admin`
- Document Supabase setup, Server Actions pattern, tax calculation localizations, TypeScript build status
- Write `handoff.md` and report to parent orchestrator via `send_message`

## Current Parent
- Conversation ID: 26977d3a-60cc-4354-9371-d200e74ba403
- Updated: 2026-08-07T11:38:00Z

## Investigation State
- **Explored paths**:
  - `package.json`, `next.config.ts`, `tsconfig.json`
  - `sql/production_auth.sql`, `sql/multi_tenant.sql`, `migration_run.sql`
  - `src/lib/supabase.ts`, `src/lib/supabaseAdmin.ts`
  - `src/app/actions/*.ts` (all 14 server action files)
  - `src/app/(erp)/*` (`caja`, `calendario`, `catalogo`, `clientes`, `compras`, `configuracion`, `contabilidad`, `equipo`, `franquicias`, `integraciones`, `kanban`, `tickets`, `whatsapp`)
  - `src/app/(saascore)/admin/*` (`page.tsx`, `billing`, `studio`)
  - `src/lib/core/taxEngine.ts`, `src/plugins/veTaxPlugin.ts`, `src/lib/core/accounting/chartOfAccounts.ts`
- **Key findings**:
  - TypeScript build (`npx tsc --noEmit`): 0 compilation errors.
  - Supabase client: Dual setup with `supabase.ts` (anon key) and `supabaseAdmin.ts` (service role key). `@supabase/ssr` not used.
  - Server Actions: Well established in `src/app/actions/`.
  - Hardcoded localizations: `taxEngine.ts` contains hardcoded `IGTF` 3% for Venezuela and fixed rates for MX, CO, US. `chartOfAccounts.ts` includes `2.1.02.02 Retenciones IGTF por Enterar`. `veTaxPlugin.ts` duplicates IGTF.
  - Mock data & domain deficiencies:
    - `/calendario`: Repurposes `documents` with `work_order` type. Lacks interactive event grid & calendar DB schema.
    - `/whatsapp`: Repurposes `documents` with `whatsapp_log` type and external image URL. Lacks CRM inbox, message threads, client tags & dedicated DB tables.
    - `/contabilidad`: Renders `LegoEngine` showing basic document totals. Lacks NIIF General Ledger (Libro Mayor), Trial Balance (Balance de Comprobación), Income Statement, and `journal_entries` integration.
    - `/franquicias`: Queries `entities` (type `branch`), top branch KPI hardcoded to first element. Lacks multi-branch analytics & multi-tenant selector.
- **Unexplored areas**: None within scope. Complete survey conducted.

## Key Decisions Made
- Completed read-only investigation and verified clean TypeScript compilation.
- Structured comprehensive analysis report into `handoff.md`.

## Artifact Index
- `.agents/explorer_survey_1/DISPATCH.md` — Initial dispatch message
- `.agents/explorer_survey_1/BRIEFING.md` — Agent working memory
- `.agents/explorer_survey_1/progress.md` — Heartbeat and step progress
- `.agents/explorer_survey_1/handoff.md` — Comprehensive handoff report
