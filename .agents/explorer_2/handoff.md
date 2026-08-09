# Handoff Report — explorer_2 (UI Z-Index & Layer Structure Audit)

## 1. Observation
Across the SaaSCore ERP UI codebase (`src/`), a total of 39 z-index declarations were found across 22 files using both standard Tailwind classes (`z-0`, `z-10`, `z-20`, `z-40`, `z-50`) and arbitrary bracket notation (`z-[50]`, `z-[60]`, `z-[70]`, `z-[80]`, `z-[100]`, `z-[200]`):

1. **FloatingHeader**: `src/components/core/FloatingHeader.tsx:21`: `className="fixed top-6 left-1/2 -translate-x-1/2 z-[50] ..."`
2. **AICopilot**:
   - `src/components/core/AICopilot.tsx:12`: FAB container `z-50`
   - `src/components/core/AICopilot.tsx:32`: Drawer panel `z-50`
   - `src/components/core/AICopilot.tsx:80`: Mobile backdrop `z-40`
3. **Drawers**:
   - `src/components/catalog/CatalogDrawer.tsx:25`: Backdrop `z-[60]`
   - `src/components/catalog/CatalogDrawer.tsx:31`: Drawer panel `z-[70]`
   - `src/components/catalog/CatalogDrawer.tsx:35`: Internal close button `z-50`
   - `src/components/clients/ClientDrawer.tsx:24`: Backdrop `z-[60]`
   - `src/components/clients/ClientDrawer.tsx:30`: Drawer panel `z-[70]`
   - `src/components/clients/ClientDrawer.tsx:34`: Internal close button `z-50`
   - `src/components/tickets/TicketDrawer.tsx:37`: Backdrop `z-40`
   - `src/components/tickets/TicketDrawer.tsx:40`: Panel `z-50`
4. **Modals & Dialogs**:
   - `src/components/catalog/CatalogModal.tsx:61`: Overlay `z-[100]`
   - `src/components/clients/ClientModal.tsx:46`: Overlay `z-[60]`
   - `src/components/compras/PurchaseOrderModal.tsx:86`: Overlay `z-[60]`
   - `src/components/compras/SupplierModal.tsx:73`: Overlay `z-[60]`
   - `src/components/equipo/EmployeeModal.tsx:51`: Overlay `z-[60]`
   - `src/components/franquicias/BranchModal.tsx:74`: Overlay `z-[60]`
   - `src/components/tickets/TicketModal.tsx:64`: Overlay `z-[60]`
   - `src/components/whatsapp/WhatsAppModal.tsx:65`: Overlay `z-50`
   - `src/components/core/OnboardingWizard.tsx:26`: Overlay `z-50`
   - `src/components/core/InvoicePrintView.tsx:23`: Overlay `z-50`
   - `src/components/studio/LegoStudio.tsx:131`: Overlay `z-50`
   - `src/app/(erp)/caja/page.tsx:235`: Overlay `z-50`
   - `src/app/(erp)/compras/page.tsx:144`: Inline modal `z-[60]`
   - `src/app/(erp)/equipo/page.tsx:152`: Inline modal `z-[60]`
5. **CommandPalette**: `src/components/core/CommandPalette.tsx:58`: `z-[100]`
6. **ToastProvider**: `src/components/core/ToastProvider.tsx:153`: `z-[200]`
7. **Breadcrumbs**: `src/components/core/Breadcrumbs.tsx:142`: Mobile dropdown `z-[80]`

---

## 2. Logic Chain
1. **Observation 1 & 4:** `FloatingHeader` has `z-[50]`, while `WhatsAppModal`, `OnboardingWizard`, `InvoicePrintView`, `caja` receipt modal, and `LegoStudio` also have `z-50`.
2. **Logic 1:** Because `FloatingHeader` sits fixed at top-center on the same z-index (`z-50`) as these modals/overlays, opening any of these modals causes `FloatingHeader` to overlap the modal title, close button, and top inputs.
3. **Observation 2 & 4:** `AICopilot` FAB has `z-50`, floating over `WhatsAppModal` (`z-50`), while `AICopilot` mobile backdrop is `z-40`, which is lower than `FloatingHeader` (`z-[50]`).
4. **Logic 2:** Clicking modal elements can trigger the AI Copilot button, and opening AI Copilot on mobile leaves `FloatingHeader` active above the dark backdrop.
5. **Observation 3 & 4:** `CatalogDrawer` and `ClientDrawer` use `z-[60]` (backdrop) and `z-[70]` (drawer panel), whereas `ClientModal`, `PurchaseOrderModal`, `SupplierModal`, `EmployeeModal`, `BranchModal`, and `TicketModal` use `z-[60]`, but `CatalogModal` uses `z-[100]`.
6. **Logic 3:** Drawers currently sit above standard modals (`z-[60]`) but below `CatalogModal` (`z-[100]`), creating unpredictable layering depending on which modal is opened.
7. **Observation 5 & 4:** `CommandPalette` uses `z-[100]`, colliding with `CatalogModal` (`z-[100]`).
8. **Logic 4:** Invoking CommandPalette via `Ctrl+K` while `CatalogModal` is active causes z-index fighting on the same layer.
9. **Conclusion:** Establishing a single, strict **Z-Index Contract** (`z-0` -> `z-10/20` -> `z-30` -> `z-40` -> `z-50` -> `z-60` -> `z-70` -> `z-80`) resolves all 6 conflict patterns cleanly.

---

## 3. Caveats
- No code changes were made in `src/` as this is a read-only investigation task.
- Implementation must replace all arbitrary `z-[...]` values with standard Tailwind utility classes (`z-30`, `z-40`, `z-50`, `z-60`, `z-70`, `z-80`).
- If custom third-party popover plugins or portal mounts are introduced in the future, they should align with `z-60` (modals) or `z-70` (tooltips/popovers).

---

## 4. Conclusion
The codebase z-index hierarchy suffers from uncoordinated arbitrary z-indexes leading to floating header overlaps, drawer/modal collision, and FAB bleed-through. 

We propose the following **Unified Z-Index Contract**:
- **Canvas / Background:** `z-0` (`AmbientBackground`)
- **In-Flow Page Content:** `z-10` / `z-20` (Layouts, KPI cards, Studio items)
- **Persistent Header:** `z-30` (`FloatingHeader`)
- **Floating Controls (FAB):** `z-40` (`AICopilot` FAB)
- **Drawers & Side Panels:** `z-50` (`CatalogDrawer`, `ClientDrawer`, `TicketDrawer`, `AICopilot` Drawer)
- **Modals, Dialogs & Fullscreen Overlays:** `z-60` (All 11 Modals, Wizards, Print views, Studio fullscreen view)
- **Command Palette / Search:** `z-70` (`CommandPalette`)
- **Toast Notifications:** `z-80` (`ToastProvider`)

All 22 target files and line references are documented in detail in `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_2\analysis.md`.

---

## 5. Verification Method
1. Inspect `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_2\analysis.md` for the complete 22-file refactoring list.
2. After implementer applies the contract changes in `src/`:
   - Run `npx tsc --noEmit` to verify TypeScript integrity.
   - Open `FloatingHeader` + `WhatsAppModal` to verify header is darkened behind modal backdrop (`z-30` < `z-60`).
   - Open `AICopilot` drawer to verify FAB orb (`z-40`) is hidden behind drawer panel (`z-50`).
   - Open `CatalogDrawer` and launch a modal to verify modal (`z-60`) opens on top of drawer (`z-50`).
   - Press `Ctrl+K` from within any open modal to verify `CommandPalette` (`z-70`) opens on top of modal (`z-60`).
   - Trigger a toast notification to verify toast container (`z-80`) displays above all UI layers.
