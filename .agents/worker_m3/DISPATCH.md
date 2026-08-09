## 2026-08-07T11:08:40Z
You are worker_m3 for the SaaSCore ERP UI System Audit project.
Working directory: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\worker_m3
Parent conversation ID: 2e89e702-4364-4580-8302-e0c2385d8fc5

Read original request at `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md`.
Read audit findings at:
- `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_1\analysis.md`
- `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\spec_miner_1\analysis.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task (Milestone 3: Secondary & Management Modules Standardization — /calendario, /whatsapp, /integraciones, /configuracion, /admin):
1. **Container Standard & Padding Alignment**:
   - `src/app/(erp)/calendario/page.tsx`: Standardize container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Change `max-w-7xl` and `p-4 md:p-6 lg:p-8` to `max-w-6xl px-4 sm:px-6 py-6`.
   - `src/app/(erp)/whatsapp/page.tsx`: Standardize container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Change `max-w-7xl` and `p-4 md:p-6 lg:p-8` to `max-w-6xl px-4 sm:px-6 py-6`. Update action buttons from `bg-emerald-600` to design system `bg-primary btn-haptic`. Ensure empty chat/messages states use `<EmptyState>`.
   - `src/app/(erp)/integraciones/page.tsx`: Standardize container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Change `max-w-4xl` and `p-4 md:p-6 lg:p-8` to `max-w-6xl px-4 sm:px-6 py-6`.
   - `src/app/(erp)/configuracion/page.tsx` & `src/app/(erp)/configuracion/plugins/page.tsx`: Standardize container wrappers to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.
   - `src/app/(saascore)/admin/page.tsx`: Standardize container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Replace native `alert('Error: ' + result.error)` with `toast({ variant: 'error', title: 'Error', description: result.error })`. Replace inline empty table row with `<EmptyState>`.
   - `src/app/(saascore)/admin/billing/page.tsx`: Standardize container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Remove `min-h-screen bg-background` wrapper and change `max-w-7xl` to `max-w-6xl`. Replace native `alert('Error: ' + result.error)` with `toast({ variant: 'error', title: 'Error', description: result.error })`. Replace inline empty table row with `<EmptyState>`.
   - `src/app/(saascore)/admin/studio/page.tsx`: Standardize container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`. Remove `min-h-screen bg-background` wrapper and change `max-w-7xl` to `max-w-6xl`.
2. **Action Buttons**: Ensure primary action buttons across all these pages use `btn-haptic bg-primary` or the updated `<Button>` primitive.
3. Run `cmd /c "npx tsc --noEmit"` and confirm 0 compilation errors.
4. Update `progress.md` in your working directory and write a complete handoff report in `handoff.md`. Send a message to parent when finished.

## 2026-08-07T16:33:25Z
You are worker_m3 (teamwork_preview_worker).
Your task is to implement Milestone 3: Specialized UI for `/whatsapp` (CRM Inbox Omnicanal).

Read the original user request at:
`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md`

Read Explorer M3's handoff report at:
`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_m3\handoff.md`

Implementation Tasks:
1. Update `src/app/actions/whatsapp.ts`:
   - Add `updateConversationStatusAction(conversationId, status, tenantId, actor)`.
2. Create modular UI components in `src/components/whatsapp/`:
   - `CustomerTagBadge.tsx`: Color-coded badges for VIP, Lead, Soporte, Cliente with dark mode support.
   - `ConversationList.tsx`: Sidebar with real-time search input, tag filter pills, unread count badges, and selection highlight.
   - `MessageHistory.tsx`: Message stream with incoming vs outgoing bubbles, timestamps, delivery status checkmarks, and auto-scroll to bottom.
   - `ChatInbox.tsx`: Header, profile summary, quick tag manager, `MessageHistory`, and inline message composer input.
3. Refactor `src/app/(erp)/whatsapp/page.tsx`:
   - Eradicate legacy client-side `getDocuments` / `getEntities` and hardcoded external images.
   - Connect directly to server actions (`getConversationsAction`, `getMessagesAction`, `sendMessageAction`, `updateCustomerTagAction`).
   - Implement optimistic message appending, 12-second refetch polling, `useToast()` feedback, and KPI summary metrics.
   - Align layout container to `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Verification:
Execute `cmd /c "npx tsc --noEmit"` and confirm 0 compilation errors.

Write your handoff report to `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\worker_m3\handoff.md` and send a message to parent orchestrator when complete.
