# Project: SaaSCore ERP - Mock Eradication & Domain Specialized UIs

## Architecture
- Framework: Next.js (App Router, Server Actions)
- Database: Supabase (PostgreSQL with RLS & Service Role Admin Client)
- State Management: React Hooks, Optimistic UI updates, Server Actions
- UI Layer: Tailwind CSS, Lucide Icons, Custom Design System (btn-haptic, bg-primary, FloatingHeader spacing)
- Fiscal/Tax Engine: Neutral configurable engine (`tenant.metadata.tax_config`), removing country-specific hardcoding (IGTF).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Erradicación Total de Mock Data | Replace static arrays across all module pages with dynamic Supabase Server Actions fetches and fallbacks | M1, M5 | Requirement R1 |
| 2 | Neutral Configurable Tax Engine | Remove hardcoded single-country taxes (IGTF) in `taxEngine.ts`, `veTaxPlugin.ts`, `chartOfAccounts.ts` | M1 | Requirement R3 |
| 3 | Server Actions & Types Layer | Create server actions & TS types for appointments, whatsapp chats, NIIF accounting, enterprise metrics | M1 | Architectural |
| 4 | `/calendario` Interactive Event Grid | Interactive monthly and weekly view grid for appointments and shift management | M2 | Requirement R2 |
| 5 | `/calendario` Event Creator & Assignment | Service appointment creation modal, employee assignment, date/time pickers, and filter controls | M2 | Requirement R2 |
| 6 | `/whatsapp` Omnichannel CRM Inbox | WhatsApp Web style interface with active conversation list, search, and message history | M3 | Requirement R2 |
| 7 | `/whatsapp` Customer Tags & Messaging | Customer labels (VIP, Lead, Soporte), quick templates, inline message composer, server action dispatch | M3 | Requirement R2 |
| 8 | `/contabilidad` NIIF General Journal | Render `journal_entries` with strict Debit/Credit balancing and transaction details | M4 | Requirement R2 |
| 9 | `/contabilidad` Trial Balance & Income Statement | Interactive financial dashboard rendering Balance de Comprobación and Estado de Resultados | M4 | Requirement R2 |
| 10 | `/contabilidad` Period Filtering | Date range / fiscal period filtering for ledger and financial statements | M4 | Requirement R2 |
| 11 | `/franquicias` Branch Performance Map & Cards | Branch performance map/cards rendering real-time sales metrics per branch | M5 | Requirement R2 |
| 12 | `/franquicias` Company / Branch Selector | Multi-branch matrix selector for viewing tenant branch details | M5 | Requirement R2 |
| 13 | Module Integration & Config Clean-up | Connect `/integraciones` and `/configuracion` to dynamic Supabase tenant metadata | M5 | Requirement R1 |
| 14 | Technical Verification | 0 TypeScript errors via `cmd /c "npx tsc --noEmit"` | M5 | Requirement Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Infrastructure & Neutral Tax Engine | Refactor tax logic, create domain types & server actions for appointments, whatsapp, accounting, enterprise | None | DONE |
| M2 | Specialized UI: `/calendario` | Interactive month/week grid, appointment modal, staff assignment, filters, Supabase server actions | M1 | DONE |
| M3 | Specialized UI: `/whatsapp` | WhatsApp Web CRM inbox, conversation list, message composer, customer labels, server actions | M1 | DONE |
| M4 | Specialized UI: `/contabilidad` | General Journal (Libro Diario NIIF), Trial Balance, Income Statement, period filter, Debit/Credit balance | M1 | IN_PROGRESS |
| M5 | Specialized UI: `/franquicias` & Final Clean-up | Branch performance map/cards, sales metrics, branch selector, mock clean-up on /integraciones & /configuracion, TS check | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Server Actions ↔ UI Components
- `appointments.ts`: `getAppointmentsAction(filter)`, `createAppointmentAction(payload)`
- `whatsapp.ts`: `getConversationsAction()`, `getMessagesAction(conversationId)`, `sendMessageAction(conversationId, text)`
- `accounting.ts`: `getJournalEntriesAction(period)`, `getTrialBalanceAction(period)`, `getIncomeStatementAction(period)`
- `enterprise.ts`: `getBranchPerformanceAction()`, `getTenantBranchesAction()`
- `taxEngine.ts`: `calculateTaxes(amount, config)` where `config` comes from `tenant.metadata.tax_config`

## Code Layout
- `src/app/actions/`: Server Actions (`appointments.ts`, `whatsapp.ts`, `accounting.ts`, `enterprise.ts`, `documents.ts`)
- `src/types/`: TypeScript Domain Interfaces (`calendario.ts`, `whatsapp.ts`, `accounting.ts`, `enterprise.ts`)
- `src/lib/core/`: Business Logic (`taxEngine.ts`, `ledgerKernel.ts`, `chartOfAccounts.ts`)
- `src/app/(erp)/`: Module Page Routes (`calendario/page.tsx`, `whatsapp/page.tsx`, `contabilidad/page.tsx`, `franquicias/page.tsx`, `integraciones/page.tsx`, `configuracion/page.tsx`)
- `src/components/`: Modular UI Components (`calendario/*`, `whatsapp/*`, `contabilidad/*`, `franquicias/*`)
