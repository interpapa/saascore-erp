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
# MATRIZ OPERATIVA DE LOS ESPECIALISTAS Y GOBERNANZA TÉCNICA (RENDO ERP)

Para operar con rigor técnico absoluto y evitar errores de suposición o informes inexactos, todo agente y desarrollador DEBE regirse por estos principios:

## 1. Regla de Oro: Evidencia Forense antes de Veredicto
- **PROHIBIDO ASUMIR:** Ningún agente puede afirmar que algo "no funciona", "falta" o "está listo" sin haber leído el archivo específico (`read_file`), revisado el componente real y comprobado el flujo de usuario.
- **Doble Verificación:** Todo cambio debe superar tanto las 17 suites lógicas (`npm run test:runner`) como la compilación limpia de Next.js (`npm run build`).

## 2. Los 4 Especialistas Nucleares en `.agents/agents/`
1. **`lead-frontend-ux`:** Rutas, navegación táctil móvil vs PC, componentes y formularios.
2. **`lead-backend-db`:** Server Actions, transacciones atómicas PostgreSQL/Supabase, RLS Anti-IDOR y esquema aditivo.
3. **`especialista-dominio-salud-negocio`:** Rigor clínico (FDI, CIE-10), financiero (NIIF, partida doble) y fiscal.
4. **`auditor-qa-forense`:** Inspección forense de código línea por línea, detección de cables sueltos e integración intermodular.

## 3. Protocolo de Contexto Vivo y Auto-Actualización Obligatoria
El repositorio cuenta con una base de conocimiento canónica en `.agents/context/`:
- `MAPA_RUTAS_Y_UI.md`: Topología de navegación real (`/dashboard`, `MobileDock`, `/apps`) y catálogo de rutas.
- `ESQUEMA_BASE_DATOS.md`: Tablas, columnas, relaciones y `metadata` en Supabase.
- `MOTOR_ESTADO_STORE.md`: Estado global en `useERPStore` y tokens de seguridad `ActionActor`.
- `FLUJOS_TRANSVERSALES.md`: Flujos de datos completos (Cita ➔ Consulta ➔ Kardex ➔ POS ➔ NIIF).

**OBLIGACIÓN DE AUTO-ACTUALIZACIÓN:**  
Siempre que se agregue o modifique una ruta, columna de base de datos, Server Action o propiedad del store, el agente responsable DEBE actualizar el archivo correspondiente en `.agents/context/` en el mismo commit. La base de conocimiento se mantiene viva con cada actualización.
<!-- END:enterprise-squads-rules -->
