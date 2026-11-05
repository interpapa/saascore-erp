<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:workflow-rules -->
# WORKFLOW: STAGING VS PRODUCTION
Para evitar romper la producción con los clientes reales (y superar la limitación del plan gratuito de Supabase de 2 proyectos), los agentes y desarrolladores DEBEN adherirse a estas reglas:

1. **Ramas (Git):**
   - `main`: Código de PRODUCCIÓN estable (App Vercel Principal).
   - `dev`: Código de DESARROLLO/PRUEBAS (App Vercel Preview).

2. **Base de Datos (Supabase Compartido):**
   Ambas ramas apuntan al MISMO Supabase. Para probar funciones destructivas (ventas, citas, eliminar ítems), se DEBE usar un 'Tenant' (Empresa) específico de Pruebas dentro de la plataforma (ej. 'Empresa Test').

3. **Cambios de Schema (SQL):**
   Como la BD es compartida, TODOS los cambios de esquema deben ser 'hacia adelante' (Additive Schema Changes).
   - **PERMITIDO:** Agregar nuevas tablas (`CREATE TABLE`), agregar nuevas columnas (`ALTER TABLE ADD COLUMN`).
   - **PROHIBIDO:** Eliminar columnas (`DROP COLUMN`), renombrar columnas (`RENAME COLUMN`), o eliminar tablas en uso. Si lo haces, el código en la rama `main` fallará inmediatamente en producción.
   - En su lugar, usa un Soft Delete o deja la columna antigua sin usar y crea una nueva.

<!-- END:workflow-rules -->

<!-- BEGIN:enterprise-squads-rules -->
# MATRIZ OPERATIVA DE LOS 5 SQUADS CORPORATIVOS (RENDO ERP - ESTILO SAP & ODOO)

Para operar con el estándar de gobernanza de SAP, Odoo y Stripe, toda tarea en este proyecto debe respetar la división de trabajo de los 5 Squads:

1. **Squad 1: Dirección & Estrategia (`ceo-orchestrator`, `cpo-product`, `consultor-funcional-erp`, `abogado-saas`)**
   - **Regla Odoo/SAP:** "Configuración antes que Personalización" (Gap Analysis).
   - Modela requerimientos en 3 clics y valida el marco regulatorio multi-tenant y de privacidad antes de programar.

2. **Squad 2: Salud & Negocio (`director-medico`, `especialista-odontologia`, `auditor-contable-niif`, `localizador-fiscal-latam`)**
   - Provee las Fichas Técnicas clínicas (FDI, CIE-10) y financieras (NIIF partida doble, IVA 16%, IGTF, tasa oficial BCV).
   - **REGLA DE ORO:** Los especialistas de dominio NUNCA modifican código fuente directamente.

3. **Squad 3: Ingeniería & Migraciones (`lead-backend`, `lead-frontend`, `upgrade-migration-bot`)**
   - Programa Server Actions ACID, APIs y componentes React con contexto quirúrgico (solo los archivos a editar).
   - Gestiona migraciones aditivas de base de datos sin downtime e importadores masivos Excel/CSV.
   - **REGLA DE ORO:** Los ingenieros no inventan reglas de negocio; implementan estrictamente la Ficha Técnica.

4. **Squad 4: Seguridad & Calidad (`ciberseguridad-zerotrust`, `qa-tester`, `integrador-intermodular`)**
   - Filtro implacable: corre las 17 suites (`npm run test:runner`), valida `npm run build` y audita Anti-IDOR.
   - **REBOTE AUTÓNOMO:** Si un test falla, QA rechaza el ticket al desarrollador con el error exacto para auto-reparación antes de continuar.
   - **INTEGRADOR:** Audita que los datos fluyan íntegros entre módulos (Citas ➔ Ficha ➔ Kardex ➔ Caja POS ➔ Contabilidad).

5. **Squad 5: Crecimiento, Red de Partners & Academia (`partner-ecosystem-lead`, `academia-onboarding-lms`, `growth-copywriter`, `customer-success`)**
   - Gestiona la red de afiliados y revendedores (Tracks Build, Sell, Service, Manage con RevShare mensual).
   - Diseña manuales de 1 página (cheatsheets) y simuladores de caja POS para capacitar al personal en 10 minutos.
   - Asegura soporte continuo y plantillas automatizadas de WhatsApp.

# REGLA DE OPTIMIZACIÓN RADICAL DE TOKENS (JIT CONTEXT)
- **Punteros sobre Payloads:** Usar enlaces `file:///path/to/file#L10-L40` en vez de transferir archivos completos entre agentes.
- **Model Tiering:** Modelos `pro`/`inherit` para estrategia, razonamiento clínico y NIIF; modelos `flash`/`flash_lite` para QA, tests y sintaxis.
<!-- END:enterprise-squads-rules -->
