# SaaSCore ERP UI System Audit — Container & Layout Audit Report

**Auditor**: Explorer 1 (`explorer_1`)  
**Date**: 2026-08-07  
**Scope**: Core Modules (`/caja`, `/clientes`, `/catalogo`, `/compras`, `/equipo`, `/contabilidad`) and Secondary Modules (`/calendario`, `/whatsapp`, `/integraciones`, `/configuracion`, `/admin`).

---

## 1. Executive Summary & Design System Standards

To ensure visual integrity across SaaSCore ERP, all module view containers must adhere to the unified container contract defined in Requirement R1:

- **Unified Outer Container**: `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 relative`
- **FloatingHeader Spacing**: Top padding of 80px (`pt-20`) is provided globally by `ERPLayout` (`src/app/(erp)/layout.tsx`). Module page containers MUST NOT specify fixed full-height hacks (`h-[calc(100vh-100px)]` or `h-full overflow-y-auto`) that force internal scrolling or cause vertical clipping relative to the `FloatingHeader`.
- **Header Structure**: Standardized title flex row:
  ```tsx
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-black text-foreground tracking-tight">Title</h1>
      <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5">Description</p>
    </div>
    {/* Primary Action Button */}
  </div>
  ```
- **Primary Action Buttons**: Must use `bg-primary hover:bg-primary/90 text-primary-foreground ... btn-haptic`.
- **Feedback & Toasts**: Browser native `alert()` MUST NOT be used. All asynchronous operations must trigger `useToast()`.

---

## 2. Core Modules Detailed Audit

### 2.1 `/caja` (Punto de Venta POS)
- **File Location**: `src/app/(erp)/caja/page.tsx` (Line 166)
- **Current Outer Container**:
  ```tsx
  <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] w-full max-w-7xl mx-auto p-4 pt-6 gap-6 animate-in fade-in duration-300">
  ```
- **Identified Discrepancies**:
  1. Container max-width is `max-w-7xl` instead of standard `max-w-6xl`.
  2. Outer padding is `p-4 pt-6` instead of `px-4 sm:px-6 py-6`.
  3. Uses fixed height `h-[calc(100vh-100px)]` which causes vertical layout clipping and competes with `ERPLayout`'s `pt-20`.
- **Required Changes**:
  - Refactor outer container class to:
    `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300`
  - Remove fixed height calculation `h-[calc(100vh-100px)]` and let internal panels define fluid heights (`min-h-[600px]` or `flex-1`).

---

### 2.2 `/clientes` (Directorio CRM)
- **File Location**: `src/app/(erp)/clientes/page.tsx` (Line 180)
- **Current Outer Container**:
  ```tsx
  <div className="max-w-6xl mx-auto w-full h-full overflow-y-auto px-4 sm:px-6 py-6 relative">
  ```
- **Identified Discrepancies**:
  1. Container uses `h-full overflow-y-auto`, creating an unnecessary nested scroll container inside `ERPLayout`'s main viewport.
  2. Outer container max-width and padding (`max-w-6xl`, `px-4 sm:px-6 py-6`) are already correct.
- **Required Changes**:
  - Remove `h-full overflow-y-auto` from the root container div.
  - Standardized root class: `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 relative`.

---

### 2.3 `/catalogo` (Catálogo de Repuestos y Servicios)
- **File Location**: `src/app/(erp)/catalogo/page.tsx` (Line 173)
- **Current Outer Container**:
  ```tsx
  <div className="max-w-6xl mx-auto w-full h-full overflow-y-auto px-4 sm:px-6 py-6 relative">
  ```
- **Identified Discrepancies**:
  1. Container uses `h-full overflow-y-auto` creating nested scrolling behavior.
  2. Outer max-width and padding match standard (`max-w-6xl`, `px-4 sm:px-6 py-6`).
- **Required Changes**:
  - Remove `h-full overflow-y-auto` from the root container div.
  - Standardized root class: `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 relative`.

---

### 2.4 `/compras` (Compras y Abastecimiento SRM)
- **File Location**: `src/app/(erp)/compras/page.tsx` (Line 119)
- **Current Outer Container**:
  ```tsx
  <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto p-4 md:p-8 relative">
  ```
- **Identified Discrepancies**:
  1. Max-width is set to `max-w-5xl` instead of standard `max-w-6xl` (causes horizontal misalignment with `/clientes` and `/catalogo`).
  2. Outer padding is `p-4 md:p-8` instead of `px-4 sm:px-6 py-6`.
  3. Uses `h-full overflow-y-auto` creating nested scrolling.
  4. Native `alert()` used on Line 66 (`alert(err.message || 'Error al crear la orden de compra')`) instead of `toast()`.
  5. Modal rendered directly with `z-[60]` instead of standard modal abstraction.
- **Required Changes**:
  - Update root container class to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 relative`.
  - Replace native `alert()` with `useToast()` provider call (`toast({ variant: 'error', ... })`).

---

### 2.5 `/equipo` (Gestión de Personal HRMS)
- **File Location**: `src/app/(erp)/equipo/page.tsx` (Line 127)
- **Current Outer Container**:
  ```tsx
  <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto p-4 md:p-8 relative">
  ```
- **Identified Discrepancies**:
  1. Max-width is set to `max-w-5xl` instead of standard `max-w-6xl`.
  2. Outer padding is `p-4 md:p-8` instead of `px-4 sm:px-6 py-6`.
  3. Uses `h-full overflow-y-auto` causing nested scrollbars.
  4. Native `alert()` used on Line 74 (`alert(err.message || 'Error al guardar empleado')`).
  5. Modal rendered directly with `z-[60]`.
- **Required Changes**:
  - Update root container class to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 relative`.
  - Replace native `alert()` with `useToast()` call (`toast({ variant: 'error', ... })`).

---

### 2.6 `/contabilidad` (Contabilidad y Libro Diario)
- **File Location**: `src/app/(erp)/contabilidad/page.tsx` (Line 115)
- **Current Outer Container**:
  ```tsx
  <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
  ```
- **Identified Discrepancies**:
  1. Max-width is set to `max-w-7xl` instead of standard `max-w-6xl`.
  2. Outer padding is `p-4 md:p-6 lg:p-8 space-y-6` instead of `px-4 sm:px-6 py-6`.
  3. Header element lacks subtitle container wrapper and action alignment.
  4. Loading state wrapper (Line 124) uses `h-[calc(100vh-100px)]`.
- **Required Changes**:
  - Refactor outer container class to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6`.
  - Align header layout with standardized header structure (`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8`).
  - Standardize loading spinner wrapper.

---

## 3. Secondary Modules Detailed Audit

### 3.1 `/calendario` (Calendario y Citas)
- **File Location**: `src/app/(erp)/calendario/page.tsx` (Line 118)
- **Current Outer Container**:
  ```tsx
  <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
  ```
- **Identified Discrepancies**:
  1. Max-width is `max-w-7xl` instead of standard `max-w-6xl`.
  2. Outer padding is `p-4 md:p-6 lg:p-8 space-y-6` instead of `px-4 sm:px-6 py-6`.
  3. KPI cards (Lines 135-163) use hardcoded `grid grid-cols-1 md:grid-cols-3 gap-6` and `rounded-3xl` instead of standard KPI cards or Lego stat grid.
  4. Primary button "Agendar Cita" (Line 127) lacks `btn-haptic` class.
- **Required Changes**:
  - Update root container class to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6`.
  - Add `btn-haptic` class to action button.

---

### 3.2 `/whatsapp` (WhatsApp CRM)
- **File Location**: `src/app/(erp)/whatsapp/page.tsx` (Line 93)
- **Current Outer Container**:
  ```tsx
  <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
  ```
- **Identified Discrepancies**:
  1. Max-width is `max-w-7xl` instead of `max-w-6xl`.
  2. Outer padding is `p-4 md:p-6 lg:p-8 space-y-6` instead of `px-4 sm:px-6 py-6`.
  3. Primary button "Nuevo Mensaje" (Line 100) uses custom `bg-emerald-600 hover:bg-emerald-700` instead of `bg-primary`.
  4. Non-standard `rounded-3xl` cards for KPI metrics.
- **Required Changes**:
  - Update root container class to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6`.
  - Standardize primary button styles and KPI card border radius.

---

### 3.3 `/integraciones` (Centro de Integraciones)
- **File Location**: `src/app/(erp)/integraciones/page.tsx` (Lines 82-83)
- **Current Outer Container**:
  ```tsx
  <div className="w-full">
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
  ```
- **Identified Discrepancies**:
  1. Redundant outer `<div className="w-full">` wrapper.
  2. Inner container max-width is `max-w-4xl` instead of `max-w-6xl`.
  3. Outer padding is `p-4 md:p-6 lg:p-8` instead of `px-4 sm:px-6 py-6`.
- **Required Changes**:
  - Remove redundant outer wrapper `div`.
  - Set root container to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6`.

---

### 3.4 `/configuracion` & `/configuracion/plugins`
- **File Locations**:
  - `src/app/(erp)/configuracion/page.tsx` (Lines 73-74)
  - `src/app/(erp)/configuracion/plugins/page.tsx` (Line 40)
- **Current Outer Containers**:
  - `/configuracion`:
    ```tsx
    <div className="w-full">
      <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
    ```
  - `/configuracion/plugins`:
    ```tsx
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
    ```
- **Identified Discrepancies**:
  1. `/configuracion` has redundant outer `div`, `max-w-3xl` (narrow), and non-standard `p-4 md:p-6 lg:p-8`.
  2. `/configuracion/plugins` has `p-8 space-y-6 max-w-6xl mx-auto` instead of standard `max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.
  3. `/configuracion/plugins` uses hardcoded dark slate background classes (`bg-slate-900`, `text-white`, `bg-slate-950/40`) instead of semantic theme tokens (`bg-card`, `text-foreground`).
- **Required Changes**:
  - Remove redundant outer wrapper in `/configuracion` and set container to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6`.
  - Update `/configuracion/plugins` container to `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6` and refactor hardcoded dark classes to semantic design tokens.

---

### 3.5 `/admin` (Master Control Panel & Sub-routes)
- **File Locations**:
  - `src/app/(saascore)/admin/page.tsx` (Line 38)
  - `src/app/(saascore)/admin/billing/page.tsx` (Lines 62, 77)
  - `src/app/(saascore)/admin/studio/page.tsx` (Lines 29, 44)
- **Current Outer Containers**:
  - `/admin/page.tsx`:
    ```tsx
    <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-300">
    ```
  - `/admin/billing/page.tsx`:
    ```tsx
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="p-8 max-w-7xl mx-auto space-y-8">
    ```
  - `/admin/studio/page.tsx`:
    ```tsx
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="p-8 max-w-7xl mx-auto space-y-8">
    ```
- **Identified Discrepancies**:
  1. `/admin` runs inside `SaaSCoreLayout` (`src/app/(saascore)/layout.tsx`), which already renders a fixed sidebar and main wrapper with `p-8`.
  2. `/admin/billing` and `/admin/studio` add redundant `min-h-screen bg-background` and internal `<header>` bars inside the `SaaSCoreLayout` main content area.
  3. `max-w-7xl` used in billing and studio pages instead of `max-w-6xl`.
  4. Browser native `alert()` used in `admin/page.tsx` (Line 32) and `admin/billing/page.tsx` (Line 33).
- **Required Changes**:
  - Remove redundant `min-h-screen bg-background` wrappers and top navigation headers in sub-routes where `SaaSCoreLayout` already provides layout shell.
  - Standardize max-width to `max-w-6xl mx-auto w-full`.
  - Replace native `alert()` calls with `toast()`.

---

## 4. Summary Matrix of Layout & Container Compliance

| Module Route | File Path | Current Max Width | Current Padding/Margin | Top Spacing/Height Issues | Native Alert Usage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/caja` | `src/app/(erp)/caja/page.tsx` | `max-w-7xl` ❌ | `p-4 pt-6` ❌ | `h-[calc(100vh-100px)]` ❌ | No | Non-compliant |
| `/clientes` | `src/app/(erp)/clientes/page.tsx` | `max-w-6xl` ✅ | `px-4 sm:px-6 py-6` ✅ | `h-full overflow-y-auto` ❌ | No | Partially compliant |
| `/catalogo` | `src/app/(erp)/catalogo/page.tsx` | `max-w-6xl` ✅ | `px-4 sm:px-6 py-6` ✅ | `h-full overflow-y-auto` ❌ | No | Partially compliant |
| `/compras` | `src/app/(erp)/compras/page.tsx` | `max-w-5xl` ❌ | `p-4 md:p-8` ❌ | `h-full overflow-y-auto` ❌ | Yes (`line 66`) ❌ | Non-compliant |
| `/equipo` | `src/app/(erp)/equipo/page.tsx` | `max-w-5xl` ❌ | `p-4 md:p-8` ❌ | `h-full overflow-y-auto` ❌ | Yes (`line 74`) ❌ | Non-compliant |
| `/contabilidad` | `src/app/(erp)/contabilidad/page.tsx` | `max-w-7xl` ❌ | `p-4 md:p-6 lg:p-8` ❌ | `h-[calc(100vh-100px)]` ❌ | No | Non-compliant |
| `/calendario` | `src/app/(erp)/calendario/page.tsx` | `max-w-7xl` ❌ | `p-4 md:p-6 lg:p-8` ❌ | Header & grid spacing ❌ | No | Non-compliant |
| `/whatsapp` | `src/app/(erp)/whatsapp/page.tsx` | `max-w-7xl` ❌ | `p-4 md:p-6 lg:p-8` ❌ | Fixed height `600px` ❌ | No | Non-compliant |
| `/integraciones` | `src/app/(erp)/integraciones/page.tsx` | `max-w-4xl` ❌ | `p-4 md:p-6 lg:p-8` ❌ | Extra wrapper div ❌ | No | Non-compliant |
| `/configuracion` | `src/app/(erp)/configuracion/page.tsx` | `max-w-3xl` ❌ | `p-4 md:p-6 lg:p-8` ❌ | Extra wrapper div ❌ | No | Non-compliant |
| `/configuracion/plugins` | `src/app/(erp)/configuracion/plugins/page.tsx` | `max-w-6xl` ✅ | `p-8` ❌ | Hardcoded dark colors ❌ | No | Non-compliant |
| `/admin` | `src/app/(saascore)/admin/page.tsx` | `max-w-6xl` ✅ | `p-8` (from layout) | Native alert (line 32) ❌ | Yes (`line 32`) ❌ | Partially compliant |
| `/admin/billing` | `src/app/(saascore)/admin/billing/page.tsx` | `max-w-7xl` ❌ | `p-8` ❌ | Redundant min-h-screen ❌ | Yes (`line 33`) ❌ | Non-compliant |
| `/admin/studio` | `src/app/(saascore)/admin/studio/page.tsx` | `max-w-7xl` ❌ | `p-8` ❌ | Redundant min-h-screen ❌ | No | Non-compliant |

---

## 5. Actionable Implementation Recommendations for Implementer

1. **Enforce Container Blueprint**:
   Every page in `src/app/(erp)/` should root with:
   `<div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 relative">` (or with `space-y-6` where vertical section stacking is needed).

2. **Eliminate Height Hacks & Nested Scrollbars**:
   Remove `h-[calc(100vh-100px)]` and `h-full overflow-y-auto` from module page top containers. Let document scroll manage content height smoothly below `FloatingHeader`'s `pt-20`.

3. **Standardize Page Headers & Primary Action Buttons**:
   Ensure all page header flex containers use `flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8`.
   Action buttons must include `btn-haptic bg-primary hover:bg-primary/90 text-primary-foreground`.

4. **Replace All Native Browser Alerts**:
   Replace `alert(...)` calls in `compras/page.tsx`, `equipo/page.tsx`, `admin/page.tsx`, and `admin/billing/page.tsx` with `useToast()`.
