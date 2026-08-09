# Project Implementation Plan

## Phase 0: Survey & Codebase Assessment
- [ ] Dispatch 3 parallel Explorers/Spec Miners to audit `src/app/(erp)` and Supabase integration setup.
- [ ] Aggregate findings into `PROJECT.md` at project root.

## Phase 1: Milestone Decomposition & Architecture Design
- [ ] Create `PROJECT.md` with Feature Inventory, Milestone list, Interface Contracts, and Code Layout.

## Phase 2: Execution of Milestones
- [ ] Milestone 1: Supabase Server Actions & Dynamic Data Integration / Eradication of mock data.
- [ ] Milestone 2: Specialized UI Domain - `/calendario` (Interactive Grid, Service Events, Employee Assignment, Filters).
- [ ] Milestone 3: Specialized UI Domain - `/whatsapp` (CRM Omnichannel Inbox, Active Chats, History, Labels, Messaging).
- [ ] Milestone 4: Specialized UI Domain - `/contabilidad` (NIIF General Journal, Trial Balance, Income Statement, Period Filtering, Debit/Credit balancing).
- [ ] Milestone 5: Specialized UI Domain - `/franquicias` & Neutral Tax Engine (Branch performance, real-time sales metrics, company selector, remove hardcoded single-country taxes like IGTF).

## Phase 3: Final Verification & Audit
- [ ] Technical verification: `cmd /c "npx tsc --noEmit"` executes with 0 TypeScript compilation errors.
- [ ] Forensic integrity audit across all modified modules.
- [ ] Final handoff report to Sentinel / Parent.
