# Project: SaaSCore ERP UI System Audit and Implementation

## Architecture
- **Framework**: Next.js (App Router), React, TypeScript, Tailwind CSS.
- **Layouts**: `src/app/(erp)/layout.tsx` (`ERPLayout`), `src/app/(saascore)/admin/layout.tsx` (`SaaSCoreLayout`).
- **Unified Container Standard**: `<div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">`
- **Unified Z-Index Contract**:
  - `z-0`: Canvas / Background
  - `z-10` / `z-20`: Content / Layouts / Studio items
  - `z-30`: Persistent Floating Header (`FloatingHeader.tsx`)
  - `z-40`: Floating Action Button (`AICopilot.tsx` FAB, `Breadcrumbs` mobile dropdown)
  - `z-50`: Drawers & Side Panels (`CatalogDrawer`, `ClientDrawer`, `TicketDrawer`, `AICopilot` Drawer panel)
  - `z-60`: Modals, Dialogs & Fullscreen Overlays (All 11 Modals, Wizards, Print View, Studio)
  - `z-70`: Command Palette / Search (`CommandPalette.tsx`)
  - `z-80`: Toast Notifications (`ToastProvider.tsx`)
- **Action Buttons**: Primary action buttons use `btn-haptic bg-primary`. Base `<Button>` component updated.
- **Empty States**: Standardized `<EmptyState>` component used across all modules for empty lists/tables.
- **Notifications**: `useToast()` replaces native browser `alert()` and `confirm()` calls.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Z-Index Hierarchy Standard | Implement unified Z-Index contract across 22 floating/modal components | M1 | explorer_2 |
| 2 | Primitive Components & Design System | Update Button primitive (`btn-haptic`, `bg-primary`), EmptyState & ToastProvider | M1 | spec_miner_1 |
| 3 | Core Module Container & UI Alignment | Standardize `/caja`, `/clientes`, `/catalogo`, `/compras`, `/equipo`, `/contabilidad` containers, padding, empty states, toasts & buttons | M2 | explorer_1 |
| 4 | Secondary Module Container & UI Alignment | Standardize `/calendario`, `/whatsapp`, `/integraciones`, `/configuracion`, `/admin` containers, padding, empty states, toasts & buttons | M3 | explorer_1 |
| 5 | TypeScript Baseline & Integrity Verification | `npx tsc --noEmit` zero compilation errors, full review & forensic audit | M4 | spec_miner_1 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Global Design System & Z-Index Layering | Primitive Button, Z-Index contract across 22 components, Toast & EmptyState primitives | none | DONE |
| M2 | Core Modules Layout & UI Standardization | `/caja`, `/clientes`, `/catalogo`, `/compras`, `/equipo`, `/contabilidad` | M1 | DONE |
| M3 | Secondary & Admin Modules Layout Standardization | `/calendario`, `/whatsapp`, `/integraciones`, `/configuracion`, `/admin` (and sub-routes) | M1 | DONE |
| M4 | Final Quality Gate & Verification | TypeScript 0 errors check, Reviewer approval, Forensic Audit CLEAN | M2, M3 | DONE |

## Code Layout
- `src/components/ui/button.tsx` (Button primitive)
- `src/components/core/FloatingHeader.tsx` (Header z-30)
- `src/components/core/AICopilot.tsx` (FAB z-40, Drawer z-50)
- `src/components/core/CommandPalette.tsx` (z-70)
- `src/components/core/ToastProvider.tsx` (z-80)
- `src/components/core/EmptyState.tsx` (EmptyState primitive)
- `src/components/catalog/` (`CatalogDrawer.tsx`, `CatalogModal.tsx`)
- `src/components/clients/` (`ClientDrawer.tsx`, `ClientModal.tsx`)
- `src/components/compras/` (`PurchaseOrderModal.tsx`, `SupplierModal.tsx`)
- `src/components/equipo/` (`EmployeeModal.tsx`)
- `src/components/franquicias/` (`BranchModal.tsx`)
- `src/components/tickets/` (`TicketDrawer.tsx`, `TicketModal.tsx`)
- `src/components/whatsapp/` (`WhatsAppModal.tsx`)
- `src/app/(erp)/` (`caja`, `clientes`, `catalogo`, `compras`, `equipo`, `contabilidad`, `calendario`, `whatsapp`, `integraciones`, `configuracion`)
- `src/app/(saascore)/admin/` (`admin`, `billing`, `studio`)
