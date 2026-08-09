## 2026-08-07T11:35:51Z
You are teamwork_preview_explorer (Explorer 1).
Your working directory is `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_survey_1`. Create your working directory and maintain your `progress.md` and `handoff.md` there.

Objective:
Investigate the project codebase at `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react` to inventory mock data usage across all modules (`/calendario`, `/whatsapp`, `/integraciones`, `/franquicias`, `/configuracion`, `/contabilidad`), current Supabase client setup, Server Actions pattern, and any hardcoded tax/fiscal localizations (e.g. single-country IGTF).

Mandatory Requirement:
Read `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\ORIGINAL_REQUEST.md` completely before starting your investigation.

Scope:
- Find all files in `src/app/(erp)` and `src/components` containing mock arrays, static json, or dummy data.
- Check Supabase integration (`@supabase/supabase-js`, environment variables, helper clients, existing server actions or DB queries).
- Locate tax calculation logic and identify hardcoded localizations (e.g., IGTF, single-country VAT/IVA flags) that need to be made neutral and configurable.
- Document TypeScript build status and current dependencies/types.

Output:
Write a comprehensive structured report to `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_survey_1\handoff.md`.
Send a concise summary message back to parent orchestrator.
