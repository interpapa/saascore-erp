# 🤖 RULES FOR AI AGENTS AND DEVELOPERS (RENDO ERP)

**CRITICAL INSTRUCTION FOR ANY AI:** 
Before making any changes to this codebase, you MUST read and strictly adhere to the following workflow rules. Rendo ERP is a production-level enterprise application. Carelessness will break live customer instances.

## 1. ENVIRONMENTS & DATABASE ARCHITECTURE
*   **Production (main branch):** Deployed on Vercel. Uses the endo-prod Supabase database. Contains real financial and customer data. **NEVER modify schema directly without a migration.**
*   **Staging / Dev (dev branch):** Deployed via Vercel Preview. Uses endo-dev Supabase database. Used for QA and Integration.
*   **Local (localhost):** Uses endo-dev database.

## 2. BRANCHING STRATEGY (STRICT)
Do not push directly to main or dev. You must branch out using the following prefixes:
*   eature/...: For all new capabilities (e.g., eature/payroll-module). Branches off from dev.
*   hotfix/...: For URGENT production bugs only. Branches off directly from main. Merges back to main AND dev.
*   ugfix/...: For non-urgent bugs. Branches off dev.
*   chore/...: For maintenance, dependency updates, or text changes.

## 3. INCIDENT PROTOCOL (ROLLBACKS)
If a recent deployment breaks production:
1. The human will perform an instant Rollback in Vercel.
2. The AI must checkout main as it was before the break.
3. Branch to hotfix/incident-name.
4. Fix, test locally, and push for emergency merge.

## 4. DATABASE MIGRATIONS
*   If a eature requires a new table or column, the SQL MUST be tested in endo-dev first.
*   You must generate a migration .sql file in the repository (e.g., supabase/migrations/) containing the exact ALTER TABLE or CREATE TABLE commands.
*   This ensures the exact same SQL can be executed safely in endo-prod before the code is merged to main. NEVER drop columns (use soft-deletes or is_active flags) as this violates foreign key constraints in live environments.

## 5. CODE STANDARDS
*   Use TypeScript strictly.
*   Ensure Tailwind CSS uses the dark: class variant strategy (already configured in globals.css).
*   Commits must follow conventional commits: eat:, ix:, chore:.
