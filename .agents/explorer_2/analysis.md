# SaaSCore ERP UI System Audit — Z-Index & Layer Structure Analysis

**Author:** explorer_2 (UI Z-Index & Layer Structure Specialist)  
**Date:** 2026-08-06  
**Target Codebase:** `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\src`

---

## 1. Executive Summary

A comprehensive codebase audit was conducted to analyze the z-index hierarchy and layer structure across all components and pages of SaaSCore ERP. 

Currently, z-index values are set ad-hoc across components using a mix of standard Tailwind classes (`z-0`, `z-10`, `z-20`, `z-40`, `z-50`) and arbitrary bracket notation (`z-[50]`, `z-[60]`, `z-[70]`, `z-[80]`, `z-[100]`, `z-[200]`). This uncoordinated layering creates severe visual conflicts:
- **`FloatingHeader` (`z-[50]`)** sits at the exact same elevation as several modals (`WhatsAppModal`, `OnboardingWizard`, `InvoicePrintView`, `caja` receipt modal) and drawers (`AICopilot`, `TicketDrawer`), causing the top header to obscure modal titles, close buttons, and text inputs.
- **`AICopilot` FAB (`z-50`)** floats over `WhatsAppModal` (`z-50`) and `OnboardingWizard` (`z-50`), allowing users to accidentally trigger the AI chat while interacting with modal forms.
- **Drawers (`CatalogDrawer`, `ClientDrawer`)** use `z-[60]` for backdrops and `z-[70]` for drawer containers, which sit *above* standard modals (`z-[60]`) but *below* `CatalogModal` (`z-[100]`).
- **CommandPalette (`z-[100]`)** collides with `CatalogModal` (`z-[100]`).
- **`Breadcrumbs` mobile dropdown (`z-[80]`)** is contained inside `FloatingHeader` (`z-[50]`), creating an improper stacking context hierarchy.

This report documents all existing occurrences, details the active layer conflicts, proposes a single **Unified Z-Index Contract**, and lists all 22 files requiring adjustment.

---

## 2. Complete Inventory of Z-Index Occurrences in Codebase

| File Path | Line # | Element / Component | Current Class |
|---|---|---|---|
| `src/components/core/AmbientBackground.tsx` | 7 | Background blob wrapper | `z-0` |
| `src/app/(erp)/layout.tsx` | 15 | Root ERP layout wrapper | `z-10` |
| `src/app/(saascore)/layout.tsx` | 43 | SaaSCore Hub sticky header | `z-10` |
| `src/app/(erp)/franquicias/page.tsx` | 78, 84, 89, 95, 100, 106 | KPI card text elements | `relative z-10` |
| `src/app/(erp)/whatsapp/page.tsx` | 111, 121, 131 | KPI card headers | `relative z-10` |
| `src/components/studio/LegoStudio.tsx` | 201 | Selected piece highlight ring | `z-10` |
| `src/components/studio/LegoStudio.tsx` | 207 | Selected piece action controls | `z-20` |
| `src/components/studio/LegoStudio.tsx` | 231 | Studio configuration sidebar drawer | `z-20` |
| `src/components/core/Breadcrumbs.tsx` | 142 | Mobile breadcrumbs dropdown menu | `z-[80]` |
| `src/components/core/FloatingHeader.tsx` | 21 | Top floating header container | `z-[50]` |
| `src/components/core/AICopilot.tsx` | 12 | Floating Action Button (FAB) orb | `z-50` |
| `src/components/core/AICopilot.tsx` | 32 | Copilot side drawer panel | `z-50` |
| `src/components/core/AICopilot.tsx` | 80 | Mobile backdrop overlay | `z-40` |
| `src/components/tickets/TicketDrawer.tsx` | 37 | Drawer backdrop | `z-40` |
| `src/components/tickets/TicketDrawer.tsx` | 40 | Drawer panel container | `z-50` |
| `src/components/catalog/CatalogDrawer.tsx` | 25 | Drawer backdrop overlay | `z-[60]` |
| `src/components/catalog/CatalogDrawer.tsx` | 31 | Drawer slide-over container | `z-[70]` |
| `src/components/catalog/CatalogDrawer.tsx` | 35 | Drawer close button (internal) | `z-50` |
| `src/components/catalog/CatalogDrawer.tsx` | 45 | Drawer inner header | `relative z-10` |
| `src/components/clients/ClientDrawer.tsx` | 24 | Drawer backdrop overlay | `z-[60]` |
| `src/components/clients/ClientDrawer.tsx` | 30 | Drawer slide-over container | `z-[70]` |
| `src/components/clients/ClientDrawer.tsx` | 34 | Drawer close button (internal) | `z-50` |
| `src/components/clients/ClientDrawer.tsx` | 44 | Drawer inner header | `relative z-10` |
| `src/components/catalog/CatalogModal.tsx` | 61 | Modal fixed overlay wrapper | `z-[100]` |
| `src/components/clients/ClientModal.tsx` | 46 | Modal fixed overlay wrapper | `z-[60]` |
| `src/components/compras/PurchaseOrderModal.tsx` | 86 | Modal fixed overlay wrapper | `z-[60]` |
| `src/components/compras/SupplierModal.tsx` | 73 | Modal fixed overlay wrapper | `z-[60]` |
| `src/components/equipo/EmployeeModal.tsx` | 51 | Modal fixed overlay wrapper | `z-[60]` |
| `src/components/franquicias/BranchModal.tsx` | 74 | Modal fixed overlay wrapper | `z-[60]` |
| `src/components/tickets/TicketModal.tsx` | 64 | Modal fixed overlay wrapper | `z-[60]` |
| `src/components/whatsapp/WhatsAppModal.tsx` | 65 | Modal fixed overlay wrapper | `z-50` |
| `src/components/core/OnboardingWizard.tsx` | 26 | Fullscreen onboarding wizard overlay | `z-50` |
| `src/components/core/InvoicePrintView.tsx` | 23 | Fullscreen invoice preview overlay | `z-50` |
| `src/components/studio/LegoStudio.tsx` | 131 | Lego Studio fullscreen modal | `z-50` |
| `src/app/(erp)/caja/page.tsx` | 235 | Receipt printable modal overlay | `z-50` |
| `src/app/(erp)/compras/page.tsx` | 144 | New PO inline modal backdrop | `z-[60]` |
| `src/app/(erp)/equipo/page.tsx` | 152 | Add Employee inline modal backdrop | `z-[60]` |
| `src/components/core/CommandPalette.tsx` | 58 | Command Palette fixed overlay | `z-[100]` |
| `src/components/core/ToastProvider.tsx` | 153 | Global Toast container | `z-[200]` |

---

## 3. Identified Conflicts & Vulnerabilities

### Conflict 1: FloatingHeader (`z-[50]`) obscuring Modals and Drawers (`z-50`)
- **Root Cause:** `FloatingHeader.tsx` is fixed at `top-6 left-1/2` with `z-[50]`. Simultaneously, `WhatsAppModal`, `OnboardingWizard`, `InvoicePrintView`, `caja` receipt modal, `LegoStudio`, `AICopilot` drawer, and `TicketDrawer` use `z-50`.
- **Symptom:** Because `FloatingHeader` sits at the exact same stacking level as these modals/drawers, `FloatingHeader` floats right across the top-center of opened modals, obscuring modal header text, close buttons, and top text inputs.

### Conflict 2: Inconsistent Modal Z-Indexes (`z-50` vs `z-[60]` vs `z-[100]`)
- **Root Cause:** Modals across the app use three distinct z-index levels without architectural design rationale:
  - `z-50`: `WhatsAppModal`, `OnboardingWizard`, `InvoicePrintView`, `caja` receipt modal
  - `z-[60]`: `ClientModal`, `PurchaseOrderModal`, `SupplierModal`, `EmployeeModal`, `BranchModal`, `TicketModal`, `compras` inline modal, `equipo` inline modal
  - `z-[100]`: `CatalogModal`
- **Symptom:** Open drawers (`CatalogDrawer` / `ClientDrawer` at `z-[70]`) render *above* `ClientModal` (`z-[60]`) but *below* `CatalogModal` (`z-[100]`). If a user opens `CatalogModal` while a drawer is open, it appears above; if they open `ClientModal`, it appears below the drawer backdrop!

### Conflict 3: AICopilot FAB (`z-50`) & Backdrop (`z-40`) mismatch with FloatingHeader (`z-[50]`)
- **Root Cause:** `AICopilot` floating button is `z-50`. On mobile, its dark backdrop is `z-40`.
- **Symptom:** When opening `AICopilot` on mobile, the backdrop (`z-40`) darkens the screen *behind* the `FloatingHeader` (`z-[50]`), leaving `FloatingHeader` fully active and clickable above the AI Copilot overlay. Additionally, the FAB orb at `z-50` bleeds into `z-50` modals.

### Conflict 4: Drawer internal close buttons (`z-50`) vs Drawer container (`z-[70]`)
- **Root Cause:** `CatalogDrawer.tsx` and `ClientDrawer.tsx` define drawer container at `z-[70]`, while setting internal close buttons to `z-50`.
- **Symptom:** While CSS stacking rules keep the button within the parent's context, specifying a lower explicit z-index (`z-50`) inside a `z-[70]` parent creates confusing code anti-patterns and unpredictable z-index resolution in child elements.

### Conflict 5: Breadcrumbs Mobile Dropdown (`z-[80]`) vs Parent `FloatingHeader` (`z-[50]`)
- **Root Cause:** `Breadcrumbs.tsx` mobile dropdown uses `z-[80]`, but its parent container `FloatingHeader` has `z-[50]`.
- **Symptom:** Parent stacking context (`z-[50]`) traps the child dropdown (`z-[80]`). Furthermore, if FloatingHeader elevation is changed, the mobile dropdown menu must not float over modals or pop out of sequence.

### Conflict 6: CommandPalette (`z-[100]`) colliding with CatalogModal (`z-[100]`)
- **Root Cause:** Both `CommandPalette.tsx` and `CatalogModal.tsx` use `z-[100]`.
- **Symptom:** Pressing `Ctrl+K` while `CatalogModal` is open causes DOM-order fighting at `z-[100]`, where the modal and search palette overlap glitchily.

---

## 4. Proposed Unified Z-Index Contract

To enforce strict visual hierarchy and eliminate all overlapping bugs, we propose a single, standardized **Z-Index Contract** across SaaSCore ERP.

```
┌─────────────────────────────────────────────────────────────┐  z-80 / z-100: Toast Notifications
│  Toast Container (z-80 / z-100)                             │
├─────────────────────────────────────────────────────────────┤  z-70: Command Palette & Global Search
│  Command Palette (z-70)                                     │
├─────────────────────────────────────────────────────────────┤  z-60: Modals, Dialogs, Wizards & Fullscreen Views
│  Modals & Dialogs (z-60)                                    │
│  (CatalogModal, ClientModal, PurchaseOrderModal, etc.)      │
├─────────────────────────────────────────────────────────────┤  z-50: Side Drawers & Slide-over Panels
│  Slide Drawers (z-50)                                       │
│  (CatalogDrawer, ClientDrawer, TicketDrawer, AICopilot)     │
├─────────────────────────────────────────────────────────────┤  z-40: Floating Action Controls (FAB)
│  AICopilot FAB Orb (z-40)                                   │
├─────────────────────────────────────────────────────────────┤  z-30: Persistent Navigation Header
│  FloatingHeader (z-30)                                      │
├─────────────────────────────────────────────────────────────┤  z-10 / z-20: In-Flow Page Content & Cards
│  Page Layouts & Relative Cards (z-10 / z-20)               │
├─────────────────────────────────────────────────────────────┤  z-0: Ambient Background Canvas
│  Ambient Background (z-0)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Layer Specification Table

| Layer Level | Standard Tailwind Class | Purpose | Included Components |
|---|---|---|---|
| **Layer 0: Canvas** | `z-0` | Background canvas, ambient blobs | `AmbientBackground` |
| **Layer 10-20: Page Content** | `z-10`, `z-20` | Structural layouts, relative card elements, sticky headers in sub-views | `app/(erp)/layout`, `app/(saascore)/layout`, `franquicias`, `whatsapp`, `LegoStudio` items |
| **Layer 30: Persistent Nav** | `z-30` | Top floating header | `FloatingHeader` |
| **Layer 40: Floating Controls** | `z-40` | Bottom-right Floating Action Buttons | `AICopilot` FAB orb |
| **Layer 50: Drawers & Panels** | `z-50` | Slide-over drawers & side panels | `CatalogDrawer`, `ClientDrawer`, `TicketDrawer`, `AICopilot` drawer & backdrop |
| **Layer 60: Modals & Dialogs** | `z-60` | Dialog boxes, creation modals, wizard overlays, full-screen Studio view | All 11 Modals (`CatalogModal`, `ClientModal`, `PurchaseOrderModal`, `SupplierModal`, `EmployeeModal`, `BranchModal`, `TicketModal`, `WhatsAppModal`, `OnboardingWizard`, `InvoicePrintView`, `LegoStudio` modal, inline page modals) |
| **Layer 70: Command Palette** | `z-70` | Global quick search (Ctrl+K) | `CommandPalette` |
| **Layer 80: Toasts** | `z-80` (or `z-[100]`) | Floating toast feedback system | `ToastProvider` |

---

## 5. Detailed Audit of Files Requiring Z-Index Adjustments

Here is the exact list of 22 files and lines that require z-index normalization during the implementation phase:

### 1. `src/components/core/FloatingHeader.tsx`
- **Current:** Line 21 -> `z-[50]`
- **Target:** `z-30`
- **Rationale:** Ensures floating header stays above page content (`z-10`) but below FABs (`z-40`), Drawers (`z-50`), and Modals (`z-60`).

### 2. `src/components/core/AICopilot.tsx`
- **Current:** 
  - Line 12 (FAB Orb): `z-50`
  - Line 32 (Drawer Panel): `z-50`
  - Line 80 (Mobile Backdrop): `z-40`
- **Target:**
  - Line 12 (FAB Orb): `z-40`
  - Line 32 (Drawer Panel): `z-50`
  - Line 80 (Mobile Backdrop): `z-50`
- **Rationale:** FAB orb (`z-40`) sits below drawers (`z-50`) and modals (`z-60`). Drawer panel and mobile backdrop (`z-50`) sit above header (`z-30`) and FAB (`z-40`).

### 3. `src/components/catalog/CatalogDrawer.tsx`
- **Current:**
  - Line 25 (Backdrop): `z-[60]`
  - Line 31 (Drawer Panel): `z-[70]`
  - Line 35 (Close Button): `z-50`
- **Target:**
  - Line 25 (Backdrop): `z-50`
  - Line 31 (Drawer Panel): `z-50`
  - Line 35 (Close Button): `z-10` or remove `z-50` override
- **Rationale:** Aligns drawer with standard drawer layer (`z-50`), below modals (`z-60`).

### 4. `src/components/clients/ClientDrawer.tsx`
- **Current:**
  - Line 24 (Backdrop): `z-[60]`
  - Line 30 (Drawer Panel): `z-[70]`
  - Line 34 (Close Button): `z-50`
- **Target:**
  - Line 24 (Backdrop): `z-50`
  - Line 30 (Drawer Panel): `z-50`
  - Line 34 (Close Button): `z-10` or remove `z-50` override
- **Rationale:** Aligns drawer with standard drawer layer (`z-50`), below modals (`z-60`).

### 5. `src/components/tickets/TicketDrawer.tsx`
- **Current:**
  - Line 37 (Backdrop): `z-40`
  - Line 40 (Drawer Panel): `z-50`
- **Target:**
  - Line 37 (Backdrop): `z-50`
  - Line 40 (Drawer Panel): `z-50`
- **Rationale:** Standardizes backdrop and drawer panel on `z-50` layer.

### 6. `src/components/catalog/CatalogModal.tsx`
- **Current:** Line 61 -> `z-[100]`
- **Target:** `z-60`
- **Rationale:** Standardizes modal on `z-60` layer, below CommandPalette (`z-70`) and above Drawers (`z-50`).

### 7. `src/components/clients/ClientModal.tsx`
- **Current:** Line 46 -> `z-[60]`
- **Target:** `z-60` (standardize arbitrary `z-[60]` syntax to `z-60`)

### 8. `src/components/compras/PurchaseOrderModal.tsx`
- **Current:** Line 86 -> `z-[60]`
- **Target:** `z-60` (standardize arbitrary `z-[60]` syntax to `z-60`)

### 9. `src/components/compras/SupplierModal.tsx`
- **Current:** Line 73 -> `z-[60]`
- **Target:** `z-60` (standardize arbitrary `z-[60]` syntax to `z-60`)

### 10. `src/components/equipo/EmployeeModal.tsx`
- **Current:** Line 51 -> `z-[60]`
- **Target:** `z-60` (standardize arbitrary `z-[60]` syntax to `z-60`)

### 11. `src/components/franquicias/BranchModal.tsx`
- **Current:** Line 74 -> `z-[60]`
- **Target:** `z-60` (standardize arbitrary `z-[60]` syntax to `z-60`)

### 12. `src/components/tickets/TicketModal.tsx`
- **Current:** Line 64 -> `z-[60]`
- **Target:** `z-60` (standardize arbitrary `z-[60]` syntax to `z-60`)

### 13. `src/components/whatsapp/WhatsAppModal.tsx`
- **Current:** Line 65 -> `z-50`
- **Target:** `z-60`
- **Rationale:** Elevates WhatsApp modal from drawer level (`z-50`) to modal level (`z-60`) so FloatingHeader (`z-30`) does not obscure it.

### 14. `src/components/core/OnboardingWizard.tsx`
- **Current:** Line 26 -> `z-50`
- **Target:** `z-60`
- **Rationale:** Elevates Onboarding wizard overlay from drawer level (`z-50`) to modal level (`z-60`).

### 15. `src/components/core/InvoicePrintView.tsx`
- **Current:** Line 23 -> `z-50`
- **Target:** `z-60`
- **Rationale:** Elevates print view overlay to modal level (`z-60`).

### 16. `src/components/studio/LegoStudio.tsx`
- **Current:** Line 131 -> `z-50`
- **Target:** `z-60`
- **Rationale:** Elevates Lego Studio fullscreen modal overlay to `z-60`.

### 17. `src/app/(erp)/caja/page.tsx`
- **Current:** Line 235 -> `z-50`
- **Target:** `z-60`
- **Rationale:** Elevates inline receipt modal overlay from `z-50` to `z-60`.

### 18. `src/app/(erp)/compras/page.tsx`
- **Current:** Line 144 -> `z-[60]`
- **Target:** `z-60` (standardize syntax to `z-60`)

### 19. `src/app/(erp)/equipo/page.tsx`
- **Current:** Line 152 -> `z-[60]`
- **Target:** `z-60` (standardize syntax to `z-60`)

### 20. `src/components/core/Breadcrumbs.tsx`
- **Current:** Line 142 -> `z-[80]`
- **Target:** `z-30` (or `z-10` relative inside header)
- **Rationale:** Dropdown menu is rendered inside `FloatingHeader` (`z-30`). Setting it to `z-30` or relative removes stacking context hierarchy violations.

### 21. `src/components/core/CommandPalette.tsx`
- **Current:** Line 58 -> `z-[100]`
- **Target:** `z-70`
- **Rationale:** Positions Command Palette above modals (`z-60`) and drawers (`z-50`), but below Toasts (`z-80` / `z-100`).

### 22. `src/components/core/ToastProvider.tsx`
- **Current:** Line 153 -> `z-[200]`
- **Target:** `z-80` (or `z-100` / `z-[100]`)
- **Rationale:** Positions toasts cleanly at the top of the application layer stack.

---

## 6. Verification Plan for Implementer

To verify that the unified Z-Index contract is correctly applied:
1. **Compilation Check:** Run `npx tsc --noEmit` to confirm no syntax or type errors.
2. **Visual Overlay Checks:**
   - Open `FloatingHeader` and open any modal (`CatalogModal`, `ClientModal`, `WhatsAppModal`). Verify that `FloatingHeader` dims into the background behind the dark backdrop and does not obscure modal header buttons or inputs.
   - Open `AICopilot` drawer. Verify that `AICopilot` FAB disappears or is covered by the drawer backdrop.
   - Open `CatalogDrawer` or `ClientDrawer`, then launch a modal. Verify modal floats cleanly over the drawer.
   - Press `Ctrl+K` while a modal is open. Verify `CommandPalette` opens on top of the modal.
   - Trigger a toast action while a modal or command palette is open. Verify toast appears on top of all UI layers.
