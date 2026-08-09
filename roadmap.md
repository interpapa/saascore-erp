# SaaSCore ERP - Master Roadmap & Architecture Context

Este documento define el contexto, arquitectura, estándares internacionales corporativos y la lista de tareas del proyecto SaaSCore ERP.
- Checklist Global de los 8 Módulos Enterprise: [global_architecture_checklist.md](file:///c:/Users/rodol/OneDrive/Escritorio/programacion/saascore_react/global_architecture_checklist.md).
- Benchmark Global SAP S/4HANA & Odoo 17: [world_class_erp_benchmark.md](file:///c:/Users/rodol/OneDrive/Escritorio/programacion/saascore_react/world_class_erp_benchmark.md).
- Plan de Extensibilidad y Core Blindado: [core_and_module_architecture_plan.md](file:///c:/Users/rodol/OneDrive/Escritorio/programacion/saascore_react/core_and_module_architecture_plan.md).
- Plan Maestro de Marketplace y Producción: [mega_architecture_and_marketplace_plan.md](file:///c:/Users/rodol/OneDrive/Escritorio/programacion/saascore_react/mega_architecture_and_marketplace_plan.md).

---

## 1. Estándares Internacionales y Directrices de Arquitectura

SaaSCore ERP está diseñado bajo normativas corporativas internacionales para garantizar calidad de exportación, auditoría legal y alta concurrencia.

| Módulo / Dominio | Estándar Internacional | Directrices Obligatorias de Implementación |
| :--- | :--- | :--- |
| **Finanzas y Contabilidad** | **NIIF / IFRS & US GAAP** | • **Inmutabilidad Estricta:** PROHIBIDO realizar `DELETE` o mutaciones destructivas en registros contables. Errores se corrigen exclusivamente vía **asientos de reversión (contrapartida)**.<br>• **Partida Doble:** Todo evento financiero genera Débito y Crédito balanceados.<br>• **Trazabilidad de Auditoría (Audit Trail):** Logs inmutables con actor, timestamp y payload original. |
| **Recursos Humanos y Nómina** | **GDPR & ISO 27701** | • **Mínimo Privilegio (RBAC):** Datos salariales y bancarios restringidos a roles de administración/RRHH.<br>• **Anonimización & Derecho al Olvido:** Anonimizar datos de ex-empleados preservando la integridad referencial de los pagos históricos. |
| **Operaciones e Inventario** | **ISO 9001 & GS1** | • **Trazabilidad End-to-End:** Rastreo de insumos, lotes y estados transicionales (`draft` -> `in_progress` -> `invoiced` -> `paid`).<br>• **Control de Stock:** Transacciones atómicas de inventario para evitar descuadres en compras y ventas simultáneas. |
| **Seguridad de la Información** | **ISO/IEC 27001 & OWASP Top 10** | • **Zero Trust:** Verificación de autorización Server-Side (`validateUserTenantAccess`) en cada Server Action.<br>• **Protección de Datos:** Sanitización estricta de consultas, aislamiento RLS y cifrado de llaves de servicio. |
| **Concurrencia y Tráfico** | **Cumplimiento ACID** | • **Consistencia y Atomicidad:** Manejo de transacciones en la base de datos relacional para evitar carreras críticas (`race conditions`) en ventas simultáneas. |

---

## 2. Archivos Críticos del Núcleo (Core Protegido)

1. `src/lib/supabaseAdmin.ts` - Conexión privileged de alta seguridad.
2. `src/lib/rbac.ts` - Sistema de control de acceso basado en roles.
3. `src/lib/core/tenantSecurity.ts` - Verificación multi-tenant en servidor.
4. `src/lib/core/auditLogger.ts` - Log inmutable de auditoría.
5. `src/lib/core/accountingEngine.ts` - Motor de partida doble contable.
6. `src/lib/core/taxEngine.ts` - Motor de impuestos y recargos.
7. `src/lib/core/currencyEngine.ts` - Motor bimoneda y conversiones inmutables.
8. `src/lib/core/events/eventBus.ts` - Bus de eventos desacoplado.
9. `src/lib/core/plugins/pluginManager.ts` - Gestor de plugins y extensibilidad.

---

## 3. Master Backlog de Tareas por Fases

- [x] **Fase 1: Motor Bimoneda & Guardián Multi-Tenant (Completada ✓)**
  - `[x]` Conversión bimoneda inmutable USD/Local (`currencyEngine.ts`).
  - `[x]` Verificación de permisos Multi-Tenant en servidor (`tenantSecurity.ts`).
  - `[x]` Despliegue bimoneda en POS (`/caja`) y Facturas Imprimibles (`InvoicePrintView.tsx`).

- [x] **Fase 1: Estabilización Backend & Reparación de Vulnerabilidades Críticas (Completada ✓)**
  - `[x]` **Procedimiento Atómico de Stock (Race Conditions):** Script `20260806_atomic_stock.sql` con RPC `decrement_item_stock` (`FOR UPDATE`) y refactor de `checkout.ts`.
  - `[x]` **Integridad Referencial (Soft Deletes):** Script `20260806_soft_deletes.sql` añadiendo `deleted_at` y refactor en `entities.ts` e `items.ts`.
  - `[x]` **Desacoplamiento Asíncrono (WorkerQueue):** Helper `workerQueue.ts` para tareas en segundo plano no bloqueantes.
  - `[x]` **Rate Limiting & Throttling (RateLimiter):** Guard de token-bucket `rateLimiter.ts` integrado en `checkout.ts`.

- [x] **Fase 2: Arquitectura de Core Blindado + Slots UI & Atributos Dinámicos (Completada ✓)**
  - `[x]` **Estructura de Kernel Services (`src/lib/core/kernel/`):** Aislamiento de servicios `tenantSecurityKernel.ts` y `ledgerKernel.ts`.
  - `[x]` **Motor de Inyección Dinámica de Interfaz (`UISlot.tsx`):** Componente de inyección desacoplado de UI e integrado en `ClientDrawer.tsx`.
  - `[x]` **Atributos Dinámicos (Zod Metadata Registry):** Registro y validación dinámico `metadataRegistry.ts` con Zod sobre la columna JSONB `metadata`.
  - `[x]` **Aislamiento Sandbox de Plugins:** Sandbox `pluginSandbox.ts` con tolerancia a fallos y timeouts para proteger el Kernel.


- [x] **Fase 3: Finanzas y Contabilidad Completa (NIIF / IFRS - Completada ✓)**
  - `[x]` **Plan Contable Jerárquico (`chartOfAccounts.ts`):** Estructura estándar NIIF (Activos, Pasivos, Patrimonio, Ingresos, Gastos) por niveles.
  - `[x]` **Aging Report de Cuentas por Cobrar/Pagar (`agingEngine.ts`):** Cálculo de antigüedad de saldos (Current, 31-60d, 61-90d, >90d).
  - `[x]` **Revaluación por Diferencia en Cambio (`fxRevaluationEngine.ts`):** Cálculo NIIF 21 / IAS 21 de ganancias/pérdidas no realizadas por tasa oficial.
  - `[x]` **Server Actions Contables (`src/app/actions/accounting.ts`):** Endpoints protegidos con RBAC y rate limiting.


- [x] **Fase 4: Inventario & WMS Avanzado (ISO 9001 / GS1 - Completada ✓)**
  - `[x]` **Conversión de Unidades de Medida (`uomEngine.ts`):** Conversión de unidades bulk (Cajas/Pallets) a piezas con Decimal.js.
  - `[x]` **Valoración por Costo Promedio Ponderado AVCO (`avcoEngine.ts`):** Recálculo dinámico de costo en recepciones de compra.
  - `[x]` **Trazabilidad por Lotes FEFO/FIFO (`lotTrackingEngine.ts`):** Rastreo de vencimiento y sugerencia de salida por orden de caducidad.
  - `[x]` **Server Actions WMS (`src/app/actions/inventory.ts`):** Procesamiento seguro con actualización automática en Supabase.


- [x] **Fase 5: Ventas, CRM & POS B2B (Completada ✓)**
  - `[x]` **Pipeline Kanban de Oportunidades (`crmPipelineEngine.ts`):** Probabilidad de cierre por etapa y forecast ponderado de ventas.
  - `[x]` **Suscripciones Recurrentes MRR (`subscriptionEngine.ts`):** Módulo de cobranza periódica SaaS con métricas MRR y ARR.
  - `[x]` **Portal B2B Token Resolver (`b2bPortalEngine.ts`):** Tokens de autoservicio para consulta de clientes en `/portal/[token]`.
  - `[x]` **Server Actions CRM (`src/app/actions/crm.ts`):** Endpoints protegidos con Rate Limiter y comprobación del Kernel.


- [x] **Fase 6: Compras SRM & Recepción (3-Way Matching - Completada ✓)**
  - `[x]` **Motor 3-Way Matching (`procurementEngine.ts`):** Validación estricta entre PO, Recibo de Almacén y Factura del Proveedor.
  - `[x]` **Server Actions Compras (`src/app/actions/procurement.ts`):** Creación de Órdenes de Compra y verificación 3-Way Match.
  - `[x]` **Conexión Real del Módulo `/compras`:** Conexión completa de la interfaz a Supabase real eliminando datos mock.


- [x] **Fase 7: Manufactura MES & MRP (Completada ✓)**
  - `[x]` **Lista de Materiales BOM (`mrpEngine.ts`):** Explosión automática de componentes requeridos y costo unitario estimado.
  - `[x]` **Ejecución de Órdenes de Producción (`manufacturingEngine.ts`):** Consumo atómico de materias primas, ingreso de producto terminado y asiento contable de transformación.
  - `[x]` **Server Actions MRP (`src/app/actions/mrp.ts`):** Endpoints con vista previa de factibilidad y ejecución con Kernel Guard.

- [x] **Fase 8: Recursos Humanos HRMS (GDPR / ISO 27701 - Completada ✓)**
  - `[x]` **Motor de Nómina Localizada (`payrollEngine.ts`):** Cálculo automático de sueldo bruto, deducciones y emisión de asiento contable NIIF de gasto salarial.
  - `[x]` **Custodia de Activos Corporativos (`assetCustodyEngine.ts`):** Asignación y control de equipos corporativos a empleados.
  - `[x]` **Server Actions HRMS (`src/app/actions/hrms.ts`):** Procesamiento de desembolsos salariales y custodia de activos con Kernel Guard.
  - `[x]` **Conexión Real del Módulo `/equipo`:** Conexión completa de la interfaz a Supabase real eliminando datos mock.
