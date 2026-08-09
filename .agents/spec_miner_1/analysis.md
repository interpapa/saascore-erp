# SaaSCore ERP UI System Audit — Specification Mining Analysis

**Role**: `spec_miner_1`  
**Date**: 2026-08-06  
**Target Project**: SaaSCore ERP (`c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react`)

---

## Executive Summary

As `spec_miner_1`, an exhaustive audit was performed across all specified target module pages (`/caja`, `/clientes`, `/catalogo`, `/compras`, `/equipo`, `/contabilidad`, `/calendario`, `/whatsapp`, `/integraciones`, `/configuracion`, `/admin`) focusing on design system primitives, feedback components, action button standardization, and TypeScript compilation state.

### Key Audit Highlights:
1. **EmptyState Standardization**: The central `EmptyState` component (`src/components/core/EmptyState.tsx`) is currently only utilized in `caja/page.tsx` (for catalog filter) and `ListFeed.tsx`. Multiple modules (e.g. `/caja` ticket sidebar, `/whatsapp` sidebar/chat, `/admin` tenant table, `/admin/billing` table) display plain text or custom inline elements instead of standard `EmptyState`.
2. **Native Alert & Dialog Elimination**: 5 instances of native browser calls (`alert` and `window.confirm`) were identified across `compras/page.tsx`, `equipo/page.tsx`, `admin/billing/page.tsx`, `admin/page.tsx`, and `ClientDrawer.tsx`. A central custom toast system exists at `src/components/core/ToastProvider.tsx` (`useToast` hook) positioned at `bottom-6 left-6 z-[200]`.
3. **Primary Action Button Consistency**: The primitive `<Button>` component (`src/components/ui/button.tsx`) lacks the `btn-haptic` class in `baseStyles` and hardcodes `bg-indigo-600` instead of using the design token `bg-primary`. Multiple pages feature inconsistent background colors (`bg-emerald-600`, `bg-rose-500`, `bg-slate-900`) and miss `btn-haptic`.
4. **TypeScript Build Health**: Running `cmd /c "npx tsc --noEmit"` completed with **0 errors** (exit code 0).

---

## 1. EmptyState Audit & Missing Usage

### Existing Primitive Implementation
- **File**: `src/components/core/EmptyState.tsx`
- **Design Tokens**: Glassmorphism container (`bg-card/backdrop-blur`), icon wrapper with subtle ambient glow ring, title, description, and primary CTA using `bg-primary` & `btn-haptic`.
- **Direct Usage**: Imported only in `src/app/(erp)/caja/page.tsx` and `src/components/lego/ListFeed.tsx`.

### Identified Views Missing `EmptyState` Standard
| Module / View | File Path | Current Empty Implementation | Recommended Fix |
|---|---|---|---|
| `/caja` (Ticket Cart Sidebar) | `src/app/(erp)/caja/page.tsx:263` | Custom inline `div` with `ShoppingCart` icon and plain text (`El ticket está vacío`) | Replace inline `div` with `<EmptyState icon={<ShoppingCart size={40} />} title="El ticket está vacío" description="Selecciona productos del catálogo para comenzar" />` |
| `/whatsapp` (Recent Messages Sidebar) | `src/app/(erp)/whatsapp/page.tsx:164` | Inline `div` with `<p className="text-sm">No hay mensajes recientes</p>` | Replace with `<EmptyState icon={<MessageCircle size={36} />} title="Sin mensajes recientes" description="Inicia una conversación o envía un mensaje" />` |
| `/whatsapp` (Main Chat Panel Unselected State) | `src/app/(erp)/whatsapp/page.tsx:270` | Custom centered `div` with background image opacity overlay | Replace placeholder block with centered `<EmptyState icon={<MessageCircle size={48} />} title="WhatsApp Web API" description="..." />` |
| `/admin` (Tenants Table) | `src/app/(saascore)/admin/page.tsx:70` | Inline table row `<tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay inquilinos registrados.</td></tr>` | Render `<EmptyState>` inside full-width table cell or table container |
| `/admin/billing` (Billing Clients Table) | `src/app/(saascore)/admin/billing/page.tsx:118` | Inline table row `<tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay clientes.</td></tr>` | Render `<EmptyState>` inside full-width table cell or table container |
| `/kanban` (Empty Columns) | `src/app/(erp)/kanban/page.tsx` | Blank drop area without empty state placeholder | Add compact empty state indicator per column |
| `/calendario` (Empty Schedule) | `src/app/(erp)/calendario/page.tsx` | Blank day/week slots when no appointments exist | Add lightweight empty state prompt for ticket creation |
| `/integraciones` (Catalog Filter) | `src/app/(erp)/integraciones/page.tsx` | Zero-match search filter renders empty grid | Show `<EmptyState>` when search filter yields 0 integration cards |

---

## 2. Browser Native Calls (`alert`/`confirm`) & Toast Infrastructure

### Existing Toast System Infrastructure
- **File**: `src/components/core/ToastProvider.tsx`
- **Hook**: `useToast()` -> `{ toast }`
- **API**: `toast({ variant: 'success' | 'error' | 'info' | 'warning', title: string, description?: string })`
- **Placement**: Fixed overlay at `bottom-6 left-6 z-[200]` (avoids z-index overlap with AICopilot orb at bottom-right `z-[100]`).
- **Mount Point**: Root layout `src/app/layout.tsx`.

### Native Browser Calls Requiring Replacement
| # | File Path & Line | Current Native Call | Impact / User Experience Defect | Recommended Toast / Modal Replacement |
|---|---|---|---|---|
| 1 | `src/app/(erp)/compras/page.tsx:66` | `alert(err.message \|\| 'Error al crear la orden de compra');` | Blocks browser thread, breaks application aesthetic | `toast({ variant: 'error', title: 'Error al crear orden', description: err.message })` |
| 2 | `src/app/(erp)/equipo/page.tsx:74` | `alert(err.message \|\| 'Error al guardar empleado');` | Blocks browser thread, raw text popup | `toast({ variant: 'error', title: 'Error al guardar empleado', description: err.message })` |
| 3 | `src/app/(saascore)/admin/billing/page.tsx:33` | `alert('Error: ' + result.error);` | Native browser modal in admin panel | `toast({ variant: 'error', title: 'Error de facturación', description: result.error })` |
| 4 | `src/app/(saascore)/admin/page.tsx:32` | `alert('Error: ' + result.error);` | Native browser modal in tenant management | `toast({ variant: 'error', title: 'Error de administración', description: result.error })` |
| 5 | `src/components/clients/ClientDrawer.tsx:68` | `if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?...'))` | Blocking browser confirmation dialog | Replace with confirmation modal or Toast action dialog + success toast `toast({ variant: 'success', title: 'Cliente eliminado' })` |

---

## 3. Primary Button Audit (`btn-haptic` & `bg-primary`)

### Primitive Button Component Defect
- **File**: `src/components/ui/button.tsx`
- **Issues**:
  1. `baseStyles` (line 14) is missing `btn-haptic` class (haptic feedback animation token).
  2. `variants.primary` (line 17) hardcodes `bg-indigo-600 hover:bg-indigo-700` instead of `bg-primary hover:bg-primary/90 text-primary-foreground`.
  3. Default border radius is `rounded-lg` instead of design system `rounded-xl`.

### Primary Action Button Compliance across Modules
| Module | Component / File | Button Label | Current Classes | `btn-haptic` Present? | `bg-primary` Present? | Non-Conformities |
|---|---|---|---|---|---|---|
| `/catalogo` | `catalogo/page.tsx:187` | "Nuevo Ítem" | `bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl btn-haptic` | YES | YES | None (Fully compliant) |
| `/caja` | `caja/page.tsx:358` | "Cobrar" | `bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl btn-haptic` | YES | NO | Uses hardcoded `bg-emerald-500` instead of standard primary color token |
| `/caja` | `caja/page.tsx:350` | "Borrador" | `bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl btn-haptic` | YES | N/A (Secondary) | None |
| `/compras` | `compras/page.tsx:125` | "Nueva Compra" | Header CTA button | NO | NO | Uses primitive `<Button>` which lacks `btn-haptic` and uses hardcoded indigo |
| `/compras` | `compras/page.tsx:184` | Modal Submit | `<Button type="submit">` | NO | NO | Lacks `btn-haptic`, uses hardcoded `bg-indigo-600` |
| `/equipo` | `equipo/page.tsx:133` | "Nuevo Empleado" | Header CTA button | NO | NO | Uses primitive `<Button>` which lacks `btn-haptic` and uses hardcoded indigo |
| `/equipo` | `equipo/page.tsx:199` | Modal Submit | `<Button type="submit">` | NO | NO | Lacks `btn-haptic`, uses hardcoded `bg-indigo-600` |
| `/whatsapp` | `whatsapp/page.tsx:99` | "Nuevo Mensaje" | `bg-emerald-600 hover:bg-emerald-700 text-white ... btn-haptic` | YES | NO | Hardcoded `bg-emerald-600` instead of `bg-primary` |
| `/whatsapp` | `WhatsAppModal.tsx:128` | Modal Submit | `bg-emerald-600 hover:bg-emerald-700 text-white` | NO | NO | Lacks `btn-haptic`, hardcoded `bg-emerald-600` |
| `/configuracion` | `configuracion/page.tsx:170` | "Guardar Cambios" | `<Button type="submit">` | NO | NO | Primitive `<Button>` lacks `btn-haptic` |
| `/admin` | `admin/page.tsx:44` | "Nuevo Inquilino" | `bg-rose-500 hover:bg-rose-600 text-white ... btn-haptic` | YES | NO | Hardcoded `bg-rose-500` instead of `bg-primary` |
| `/admin/studio` | `admin/studio/page.tsx:73` | "Guardar Configuración" | `bg-slate-900 text-white ...` | NO | NO | Lacks `btn-haptic`, hardcoded `bg-slate-900` |
| Drawer | `ClientDrawer.tsx:59,66` | Edit / Delete CTA | Raw `<button>` | NO | NO | Missing `btn-haptic` styling |

---

## 4. TypeScript Compilation State

- **Command Executed**: `cmd /c "npx tsc --noEmit"`
- **Exit Code**: `0`
- **Output**: Clean (0 compilation errors).
- **TypeScript Settings**: `"strict": true`, `"moduleResolution": "bundler"`, `"target": "ES2017"`.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | UI Primitive | `EmptyState` | Central empty state callout with glassmorphism, glow effect, title, description, and CTA button | `icon: ReactNode, title: string, description?: string, action?: {label, onClick}` | JSX Element | Graceful render without action if omitted | Source inspection (`src/components/core/EmptyState.tsx`) |
| 2 | UI Primitive | `ToastProvider` | Context provider & container rendering floating notification toasts at `bottom-6 left-6 z-[200]` | `toast({ variant, title, description })` | Fixed animated Toast list | Throws error if `useToast` is used outside provider | Source inspection (`src/components/core/ToastProvider.tsx`) |
| 3 | UI Primitive | `Button` Component | Reusable base button component with size, variant, and loading state | `variant, size, isLoading, icon, children` | `<button>` HTML element | Disables pointer events when `isLoading` or `disabled` | Source inspection (`src/components/ui/button.tsx`) |
| 4 | Lego Engine | `ListFeed` Empty State | Lego module list component automatically displaying `EmptyState` on empty arrays | `dna, data` | Rendered table feed or EmptyState | Displays fallback "Sin registros" if `data` is empty/null | Source inspection (`src/components/lego/ListFeed.tsx`) |
| 5 | ERP Module | POS Caja Empty Cart | Custom empty cart notice inside `/caja` module sidebar | `ticketLines.length` | Custom inline `div` element | Hardcoded text without EmptyState primitive | Source inspection (`src/app/(erp)/caja/page.tsx`) |
| 6 | CRM Module | WhatsApp Chat List | Message list grouping and active chat room panel | `messages, clients, searchTerm` | Dual-pane chat interface | Displays plain text div on empty chat list | Source inspection (`src/app/(erp)/whatsapp/page.tsx`) |
| 7 | Admin Module | Tenant & Billing Tables | SaaS Tenant management & subscription billing overview tables | `tenants` data array | Data table rows or empty `<tr>` | Render plain `<td>` on 0 rows | Source inspection (`src/app/(saascore)/admin/page.tsx`) |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Toast Position vs AICopilot | Triggering toast notification while AI Copilot orb is active | Toast appears at `bottom-6 left-6 z-[200]`, while AICopilot floats at `bottom-6 right-6 z-[100]`, avoiding layout collision. |
| 2 | Empty State inside Data Table | Table rendered with zero records (`tenants.length === 0`) | Current implementation renders `<tr><td colSpan={N}>No hay...</td></tr>` without formatting or standard `EmptyState` graphics. |
| 3 | Native `alert` in async handlers | Form submission failure in `compras/page.tsx` or `equipo/page.tsx` | Triggers browser native `alert()`, freezing JS execution thread until user dismisses browser popup. |
| 4 | Native `window.confirm` in Client Deletion | User clicks "Eliminar Cliente" in `ClientDrawer.tsx` | Triggers `window.confirm()`, pausing browser execution without design system styling. |
| 5 | Primitive `<Button>` usage | `<Button variant="primary">` rendered in modals | Produces indigo button (`bg-indigo-600`) missing micro-interaction animation (`btn-haptic`). |
