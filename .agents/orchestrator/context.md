# Context — SaaSCore ERP UI System Audit

## Background
SaaSCore ERP is a Next.js / React application with multiple module pages.
The UI needs a complete audit and standardization pass:
1. Container Layout Standard: `max-w-6xl mx-auto px-4 sm:px-6 py-6`
2. Spacing: 80px top spacing from `FloatingHeader` (e.g. `pt-20` / `mt-20`)
3. Layering & Z-Index: FloatingHeader, AICopilot button, CommandPalette, Modals, Drawers, Toasts
4. Empty States: Standardized `EmptyState` component for all empty lists
5. User Notifications: Toast notifications instead of native browser `alert()` / `confirm()`
6. Buttons: Primary action buttons using `btn-haptic` and `bg-primary`
7. TypeScript: `cmd /c "npx tsc --noEmit"` must pass with 0 errors

## Paths & References
- Workspace: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react`
- Metadata: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\orchestrator`
- Original Request: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md`
