# Comprehensive Handoff Report — Explorer Survey 3 (Contabilidad & Franquicias)

**Agent**: `teamwork_preview_spec_miner` (Spec Miner / Explorer 3)  
**Working Directory**: `c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react\.agents\explorer_survey_3`  
**Timestamp**: 2026-08-07T11:38:00Z  
**Target Domains**: `/contabilidad` (Libro Mayor & Balances NIIF) & `/franquicias` (Matriz Multi-Sucursal)

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Contabilidad | Visualización de Documentos como Libro Diario | Renderiza lista de documentos (facturas, POs) usando LegoEngine y list-feed. | `tenant_id` via `useTenantResolver` | Stat grid + Lista de documentos | Retorna array vacío si no hay tenant o falla fetch | `src/app/(erp)/contabilidad/page.tsx` |
| 2 | Contabilidad | Plan Contable Jerárquico (Chart of Accounts NIIF) | Arreglo estructurado de cuentas (Niveles 1-4) categorizadas en Activo, Pasivo, Patrimonio, Ingreso, Gasto. | `tenantId`, `actor` | Arreglo `DEFAULT_CHART_OF_ACCOUNTS` | Acceso denegado si seg. falla | `src/lib/core/accounting/chartOfAccounts.ts` |
| 3 | Contabilidad | Motor Kernel de Partida Doble (Ledger Kernel) | Inserta encabezados (`journal_entries`) y detalles (`journal_entry_lines`) verificando que Débitos == Créditos. | `JournalEntryPayload` (tenant_id, lines, description) | `{ success: true, entryId }` | Lanza error si Débitos != Créditos (> $0.01) o falla DB | `src/lib/core/kernel/ledgerKernel.ts` |
| 4 | Contabilidad | Reporte de Antigüedad de Saldos (Aging Report) | Clasifica documentos por cobrar (AR) o por pagar (AP) en rangos (0-30, 31-60, 61-90, >90 días). | `tenantId`, `type` ('customer' \| 'supplier') | `AgingBucket[]` + Totales | Retorna array vacío y error si falla consulta Supabase | `src/lib/core/accounting/agingEngine.ts` |
| 5 | Contabilidad | Revaluación Cambiaria (FX Revaluation NIIF 21) | Ajusta saldos monetarios en moneda extranjera según variación de tasa oficial BCV/oficial y genera asiento. | `tenantId`, `totalUSDReceivables`, `historicalRate` | `FXRevaluationResult` + `journalEntryId` | Error si falla tasa de cambio o validación de permisos | `src/lib/core/accounting/fxRevaluationEngine.ts` |
| 6 | Contabilidad | [FALTANTE] Balance de Comprobación NIIF | Matriz de saldos iniciales, movimientos de débito/crédito y saldos finales por cuenta contable (Nivel 1 a 4). | `tenant_id`, `period` (rango de fechas) | Cuadro balanceado de cuentas | N/A (Por implementar) | Especificación de dominio `/contabilidad` |
| 7 | Contabilidad | [FALTANTE] Estado de Resultados (P&L NIIF) | Reporte consolidado de Ingresos (4.x) menos Costos (5.1) y Gastos (5.2) con Utilidad Bruta y Neta. | `tenant_id`, `period` | Resumen de Ganancias y Pérdidas | N/A (Por implementar) | Especificación de dominio `/contabilidad` |
| 8 | Contabilidad | [FALTANTE] Libro Diario General NIIF Real | Vista detallada de asientos contables reales (`journal_entries` + `journal_entry_lines`) con badge de cuadre. | `tenant_id`, `dateRange`, `accountCode` | Tabla de asientos contables con líneas | N/A (Por implementar) | Especificación de dominio `/contabilidad` |
| 9 | Contabilidad | [FALTANTE] Filtro de Período Financiero | Selector UI para filtrar reportes por Este Mes, Trimestre Actual, Año Fiscal o Rango Personalizado. | Rango de fechas UI | Filtrado dinámico de reportes contables | Fallback al mes actual | Especificación de dominio `/contabilidad` |
| 10 | Franquicias | Directorio de Sucursales y KPIs | Tarjetas KPI (Ventas Globales, Sedes Activas, Top Sucursal) y lista de entidades tipo `branch`. | `tenant_id` | Array de `Entity` (sucursales) y revenue total | Retorna arreglo vacío si no hay sucursales | `src/app/(erp)/franquicias/page.tsx` |
| 11 | Franquicias | Modal de Registro de Sucursal | Modal para crear nuevas entidades de tipo `branch` con gerente, teléfono, email y dirección. | `FormData` en `BranchModal` | Inserción en tabla `entities` | Muestra alert con mensaje de error en UI | `src/components/franquicias/BranchModal.tsx` |
| 12 | Franquicias | API de Gestión de Entidades (`branch`) | Server Actions para listar, crear, actualizar y soft-delete de sucursales en tabla `entities`. | `CreateEntityInput`, `tenantId`, `actor` | `{ success: boolean, entity }` | Retorna `{ success: false, error }` y registra audit log | `src/app/actions/entities.ts` |
| 13 | Franquicias | [FALTANTE] Mapa Interactivo / Vista Espacial | Vista de tarjetas de rendimiento espacial o mapa interactivo de sedes con estado operativo en tiempo real. | Coordenadas/Ubicación de sedes | Rejilla interactiva con estado (Operativa, Mantenimiento) | Fallback a vista de tarjeta | Especificación de dominio `/franquicias` |
| 14 | Franquicias | [FALTANTE] Métricas de Ventas por Sucursal | Desglose y cálculo de ingresos, número de transacciones y ticket promedio por cada sucursal individual. | `tenant_id`, `branch_id` | Métricas por sucursal y ranking real de Top Sucursal | Retorna 0 en ventas si no hay facturas asociadas | Especificación de dominio `/franquicias` |
| 15 | Franquicias | [FALTANTE] Selector Global de Empresa / Sucursal | Selector UI en cabecera/toolbar para alternar contexto entre Consolidado Global y Sucursal Específica. | `branch_id` seleccionado | Contexto filtrado en Zustand y Server Actions | Fallback a Tenant Global | Especificación de dominio `/franquicias` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `createKernelJournalEntry` | Asiento desbalanceado donde Débitos = $100.00 y Créditos = $95.00 | Retorna error `Asiento contable desbalanceado: Débitos ($100.00) !== Créditos ($95.00)` y revierte la transacción. |
| 2 | `createKernelJournalEntry` | Error al insertar líneas `journal_entry_lines` tras crear encabezado | El kernel borra el encabezado recién insertado en `journal_entries` como rollback manual y retorna error. |
| 3 | `/contabilidad` actual | Empresa nueva sin documentos ni asientos | El layout de LegoEngine muestra `Ingresos Totales: $0.00`, `Cuentas x Cobrar: $0.00`, `Asientos Registrados: 0` con lista vacía sin romper la UI. |
| 4 | `/franquicias` actual | Top Sucursal cuando no existen sucursales cargadas | El KPI muestra `Top Sucursal: -` elegantemente en lugar de fallar con `undefined`. |
| 5 | `/franquicias` actual | Click en botones "Métricas" o "Inventario" de la tarjeta de sucursal | Los botones no ejecutan ninguna acción ni abren modales (son stubs UI estáticos). |
| 6 | Revaluación Cambiaria | Tasa nueva idéntica a la tasa histórica registrada | Retorna `unrealizedGainLoss: 0` sin crear asientos duplicados en la base de datos. |

---

## 1. Observation

1. **Dominio `/contabilidad`**:
   - **Ruta y Componente**: `src/app/(erp)/contabilidad/page.tsx` (133 líneas).
   - **Comportamiento Actual**: Implementa un `LegoEngine` cliente cargando `accountantDNA`. Consulta documentos mediante `getDocumentsAction` y calcula dinámicamente ingresos pagados/facturados y cuentas por cobrar.
   - **Desconexión Técnica**: Muestra las facturas transaccionales como "Libro Diario (Documentos)". No consulta ni renderiza la tabla real de asientos contables (`journal_entries` ni `journal_entry_lines`).
   - **Esquema DB Existente**: En `supabase/schema_v1.sql` (líneas 95–116) están creadas las tablas:
     - `journal_entries` (id, tenant_id, document_id, entry_date, description, total_debit, total_credit, created_at)
     - `journal_entry_lines` (id, journal_entry_id, account_code, account_name, debit, credit, description)
   - **Kernel de Partida Doble**: En `src/lib/core/kernel/ledgerKernel.ts`, la función `createKernelJournalEntry` impone validación estricta NIIF: `Math.abs(totalDebit - totalCredit) <= 0.01`.
   - **Plan de Cuentas Jerárquico**: En `src/lib/core/accounting/chartOfAccounts.ts`, se define `DEFAULT_CHART_OF_ACCOUNTS` estructurado por niveles (1. Activo, 2. Pasivo, 3. Patrimonio, 4. Ingresos, 5. Gastos).
   - **Server Actions Existentes**: `src/app/actions/accounting.ts` contiene `getAgingReportAction`, `getChartOfAccountsAction` y `runFXRevaluationAction`. **Faltan**: `getJournalEntriesAction`, `createJournalEntryAction`, `getTrialBalanceAction`, y `getIncomeStatementAction`.

2. **Dominio `/franquicias`**:
   - **Ruta y Componente**: `src/app/(erp)/franquicias/page.tsx` (219 líneas) y `src/components/franquicias/BranchModal.tsx` (148 líneas).
   - **Comportamiento Actual**: Obtiene entidades filtradas por `type: 'branch'` con `getEntitiesAction` y facturas con `getDocumentsAction`. Calcula Ventas Globales acumulando facturas de la empresa.
   - **Esquema DB Existente**: La tabla `entities` en `supabase/schema_v1.sql` soporta el tipo `'branch'`. Los metadatos de las sucursales almacenan el gerente asignado (`metadata.manager`).
   - **Faltantes Visuales y de Arquitectura**:
     - Las tarjetas de sucursales simulan un mapa con un fondo `radial-gradient` SVG CSS, pero no ofrecen interacción de mapa real ni filtrado espacial.
     - Los botones "Métricas" e "Inventario" en el pie de cada tarjeta son estáticos.
     - El KPI "Top Sucursal" toma por defecto `branches[0].name` sin desglosar facturas por `branch_id`.
     - Falta el selector de Empresa / Sucursal en la barra de navegación para cambiar el contexto global del ERP.

---

## 2. Logic Chain

1. **Evidencia de Desconexión en Contabilidad**:
   - Observación: `contabilidad/page.tsx` utiliza `getDocumentsAction` para simular asientos contables a partir de facturas.
   - Observación: `schema_v1.sql` y `ledgerKernel.ts` proveen tablas e inmutabilidad de partida doble para `journal_entries` y `journal_entry_lines`.
   - Inferencia: Para cumplir con NIIF y erradicar la simulación visual, `/contabilidad` requiere tabuladores o secciones para:
     1. **Libro Diario NIIF**: Consulta real a `journal_entries` y `journal_entry_lines`.
     2. **Balance de Comprobación**: Agregación de débitos y créditos acumulados por código de cuenta (`DEFAULT_CHART_OF_ACCOUNTS`).
     3. **Estado de Resultados (P&L)**: Agregación de saldo neto de cuentas de ingresos (grupo 4) y gastos (grupo 5).
     4. **Filtro de Período Financiero**: Parámetro de rango de fechas aplicado a las consultas contables.

2. **Evidencia de Brecha en Franquicias (Multi-Sucursal)**:
   - Observación: `franquicias/page.tsx` obtiene entidades de tipo `'branch'`, pero las ventas globales son la suma total de facturas del tenant sin discriminación por sede.
   - Inferencia: Se requiere vincular cada documento/venta a una sucursal (`metadata.branch_id` o `entity_id`) para calcular métricas individuales (ventas por sede, transacciones, ranking).
   - Inferencia: Para soportar la selección de sucursal, el store global (`useERPStore.ts`) o `useTenantResolver.ts` debe soportar la selección de una sucursal activa (`currentBranch`), filtrando las vistas transaccionales del ERP.

---

## 3. Caveats

1. **Partida Doble de Documentos Existentes**: Las facturas creadas previamente vía `createDocumentAction` no generaban automáticamente registros en `journal_entries`. El motor `accountingEngine.ts` insertaba en `documents` con `type: 'journal_entry'`. Se recomienda unificar la creación de asientos hacia `ledgerKernel.ts`.
2. **Ambiente de Desarrollo Supabase**: Las políticas RLS actuales en `migration_run.sql` permiten paso total (`USING (true)`) durante desarrollo. La integridad de tenant se valida en Server Actions vía `validateUserTenantAccess`.

---

## 4. Conclusion

Ambos dominios cuentan con cimientos sólidos en el esquema de base de datos (`schema_v1.sql`), pero requieren reemplazar los componentes de simulación o listas genéricas (`LegoEngine`) por interfaces especializadas:
- `/contabilidad` debe estructurarse con pestañas para **Balance de Comprobación**, **Estado de Resultados**, **Libro Diario NIIF** (con indicador visual de cuadre Débito = Crédito) y filtro de período.
- `/franquicias` debe evolucionar hacia un panel con métricas de ventas en tiempo real por sede, ranking dinámico, modal/drawer de rendimiento individual por sucursal y selector de empresa/sucursal activa.

---

## 5. Verification Method

Para verificar independientemente el estado actual del código:

1. **TypeScript Build & Lint Check**:
   ```powershell
   cmd /c "npx tsc --noEmit"
   ```
2. **Inspección de Archivos Contables**:
   - Ver `src/app/(erp)/contabilidad/page.tsx` para confirmar el uso de `LegoEngine` y `getDocumentsAction`.
   - Ver `src/lib/core/kernel/ledgerKernel.ts` para verificar la validación estricta de partida doble (`Math.abs(totalDebit - totalCredit) <= 0.01`).
   - Ver `src/lib/core/accounting/chartOfAccounts.ts` para verificar la estructura NIIF.
3. **Inspección de Archivos de Franquicias**:
   - Ver `src/app/(erp)/franquicias/page.tsx` para confirmar el listado de entidades tipo `branch` y el cálculo global de facturas.
   - Ver `src/components/franquicias/BranchModal.tsx` para confirmar el registro de sucursales vía `createEntityAction`.
