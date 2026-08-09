# SaaSCore ERP - Checklist Global de Arquitectura Enterprise (8 Módulos)

Este documento consolida el **roadmap funcional completo** de SaaSCore ERP organizado en 8 dominios de clase mundial (benchmark SAP S/4HANA & Odoo 17), clasificando cada función por **Básico** (obligatorio para MVP comercial) y **Enterprise** (diferenciador competitivo y monetizable en el Marketplace).

---

## Estado de Implementación Actual

| Módulo | Básico | Enterprise |
| :--- | :---: | :---: |
| 1. Arquitectura Core & Sistema Base | 60% | 10% |
| 2. Finanzas y Contabilidad | 65% | 20% |
| 3. Inventario & WMS | 30% | 0% |
| 4. Ventas, CRM & Facturación | 50% | 0% |
| 5. Compras & Abastecimiento | 35% | 0% |
| 6. Manufactura (MES & MRP) | 5% | 0% |
| 7. Recursos Humanos (HRMS) | 30% | 0% |
| 8. Gobernanza, Riesgo & Cumplimiento (GRC) | 55% | 15% |

---

## 1. ⚙️ ARQUITECTURA CORE Y SISTEMA BASE

### Básico (Fundamentos no omitibles)
- [x] **Multi-Compañía (Multi-Tenant):** Aislamiento completo de datos por empresa vía `tenantSecurity.ts`, RLS y `supabaseAdmin`.
- [x] **Multi-Moneda:** Motor bimoneda (`currencyEngine.ts`) con congelado de tasa al facturar.
- [ ] **Multi-Idioma y Zonas Horarias:** Fechas guardadas en UTC y renderizadas según la zona del usuario; archivos de traducción dinámica (i18n).
- [ ] **Importación/Exportación Masiva:** Carga/descarga de datos en CSV/Excel para migraciones de clientes (entidades, productos, saldos).
- [ ] **Sistema de Notificaciones (In-App, Email SMTP, Webhooks):** Alertas en tiempo real y correos transaccionales por eventos del ERP.
- [ ] **Gestión de Documentos y Adjuntos:** Almacenamiento optimizado de PDFs, contratos e imágenes vinculados a registros en Supabase Storage.

### Enterprise (Premium)
- [ ] **Tasas de Cambio vía API Externa:** Sincronización automática con APIs de bancos centrales (BCV, Banxico, BanRep).
- [ ] **Portal de Notificaciones Multi-Canal:** Central de mensajes con canales configurables (Email, WhatsApp, SMS).

---

## 2. 💰 FINANZAS Y CONTABILIDAD (NIIF / IFRS)

### Básico (Fundamentos no omitibles)
- [x] **Libro Mayor y Diarios Contables:** Registros de partida doble irrompibles (`accountingEngine.ts`).
- [x] **Gestión de Impuestos:** Cálculo de IVA, IGTF, retenciones y exenciones (`taxEngine.ts`).
- [x] **Cuentas por Cobrar (AR):** Vista de documentos pendientes en `/contabilidad`.
- [ ] **Plan Contable (Chart of Accounts):** Estructura jerárquica y localizable de cuentas contables.
- [ ] **Cuentas por Pagar (AP):** Reporte de antigüedad (Aging Report) de facturas de proveedores.
- [ ] **Conciliación Bancaria Manual:** Interfaz para emparejar extractos con asientos.

### Enterprise (Premium / Marketplace)
- [ ] **Cierre Contable y Bloqueo Fiscal:** Bloqueo inmutable de períodos cerrados para auditoría NIIF.
- [ ] **Contabilidad Analítica (Centros de Costo):** Trazabilidad financiera por proyecto, departamento o empleado.
- [ ] **Revaluación por Diferencia en Cambio:** Ajuste automático mensual de cuentas AR/AP según variación de tasa oficial.
- [ ] **Reconocimiento Diferido de Ingresos (NIIF 15):** Liberación automatizada de ingresos por suscripciones a lo largo del tiempo.
- [ ] **Gestión de Activos Fijos:** Tablas de depreciación/amortización con asientos automáticos mensuales.
- [ ] **Conciliación IA & API Bancaria:** Emparejamiento automático de transacciones bancarias masivas.
- [ ] **Previsión de Flujo de Efectivo (AI Cash Flow):** Pronóstico de liquidez basado en historial de cobros.
- [ ] **Consolidación Intercompañía:** Eliminación de márgenes internos en reportes de la empresa matriz.

---

## 3. 📦 INVENTARIO Y WMS (Warehouse Management System)

### Básico (Fundamentos no omitibles)
- [x] **Gestión de Productos/Servicios:** Catálogo con precio, costo y stock en `/catalogo`.
- [x] **Entradas, Salidas y Descuento de Stock:** Descuento atómico al facturar en `checkout.ts`.
- [ ] **Gestión de Variantes:** Tallas, colores, atributos en una sola matriz de producto.
- [ ] **Unidades de Medida (UoM):** Conversión matemática (ej. Comprar en "Cajas de 12", vender en "Unidades").
- [ ] **Ajustes de Inventario:** Ciclos de conteo físico y registro de mermas/averías.

### Enterprise (Premium / Marketplace)
- [ ] **Trazabilidad 360° (Lotes y Números de Serie):** Seguimiento por fechas de caducidad (FEFO).
- [ ] **Estrategias de Retiro Automáticas (FIFO / LIFO / FEFO):** Integradas en flujos de recolección.
- [ ] **Valoración Dinámica (AVCO / Costo Estándar):** Reflejo contable inmediato al recibir compras.
- [ ] **Reabastecimiento Automático (Min/Max Reorder):** Alertas y sugerencias de órdenes de compra.
- [ ] **Rutas Complejas (Dropshipping, Cross-Docking):** Flujos de transferencia directa sin almacenamiento.
- [ ] **Integración IoT / Lectores de Código de Barras:** Compatibilidad con terminales portátiles (Zebra, Honeywell).
- [ ] **Wave & Batch Picking:** Recolección agrupada optimizada para operadores de almacén.

---

## 4. 🛒 VENTAS, CRM Y FACTURACIÓN

### Básico (Fundamentos no omitibles)
- [x] **Directorio de Clientes (CRM):** Gestión de contactos en `/clientes`.
- [x] **Punto de Venta (POS):** Interfaz de caja en `/caja` con soporte bimoneda.
- [x] **Cotizaciones y Facturas:** Generación de documentos inmutables con snapshotting fiscal.
- [ ] **Embudo de Ventas (Pipeline Kanban):** Tablero de prospectos y oportunidades con etapas.
- [ ] **Listas de Precios Básicas:** Tarifas fijas por cliente o segmento.

### Enterprise (Premium / Marketplace)
- [ ] **Portal B2B del Cliente (`/portal/[token]`):** Autoservicio para ver facturas, estados de cuenta y pagar en línea.
- [ ] **Listas de Precios Dinámicas:** Descuentos automáticos por volumen, temporada o fórmulas.
- [ ] **Facturación Recurrente (Suscripciones / MRR):** Cobros periódicos con renovación automática.
- [ ] **Motor CPQ (Configure, Price, Quote):** Presupuestación de productos a medida con reglas complejas.
- [ ] **Cálculo de Comisiones:** Bonos por objetivos, efectividad de cobro y penalizaciones.
- [ ] **Lead Scoring Predictivo (IA):** Calificación automática de prospectos por probabilidad de cierre.

---

## 5. 🤝 COMPRAS Y ABASTECIMIENTO (SRM)

### Básico (Fundamentos no omitibles)
- [x] **Directorio de Proveedores:** Gestión de contactos y condiciones en `/compras`.
- [x] **Órdenes de Compra (PO):** Creación y envío de POs a proveedores.
- [ ] **Recepción de Mercancía:** Flujo de llegada de stock al almacén con actualización de inventario.
- [ ] **Cuentas por Pagar (AP) y Aging Report:** Control de vencimientos y días de mora de proveedores.

### Enterprise (Premium / Marketplace)
- [ ] **3-Way Matching:** Bloqueo de pagos si PO + Recibo de Almacén + Factura no coinciden exactamente.
- [ ] **Licitaciones RFQ Multi-Proveedor:** Solicitudes masivas con tabla comparativa de cotizaciones.
- [ ] **Acuerdos Marco (Blanket Orders):** Contratos de precio congelado para entregas escalonadas.
- [ ] **Subastas Inversas:** Portal donde proveedores compiten reduciendo el precio en tiempo real.
- [ ] **Automatización de Facturas (OCR IA):** Lectura de PDFs de proveedor para crear borrador contable.
- [ ] **Control de Calidad (QC) en Recepción:** Inspección obligatoria antes de ingresar stock.

---

## 6. 🏭 MANUFACTURA (MES Y MRP)

### Básico (Fundamentos no omitibles)
- [ ] **Lista de Materiales (BOM):** Receta de componentes para producir un producto terminado.
- [ ] **Órdenes de Producción (MO):** Flujo de consumo de materias primas y generación de producto.
- [ ] **Centros de Producción:** Definición de mesas de trabajo o máquinas.

### Enterprise (Premium / Marketplace)
- [ ] **BOM Multinivel y Subcontratación:** Órdenes anidadas y envío de partes a maquiladoras externas.
- [ ] **Programación de Capacidad Finita:** Calendario con límites reales de horas y máquinas.
- [ ] **Mantenimiento Preventivo / Predictivo:** Órdenes de revisión automáticas por tiempo de uso.
- [ ] **PLM (Product Lifecycle Management):** Control de versiones de ingeniería con historial de BOMs.
- [ ] **Gestión de Co-productos y Subproductos:** Registro y costeo de residuos útiles de producción.
- [ ] **Cálculo OEE (Overall Equipment Effectiveness):** Medición de efectividad real de las máquinas.

---

## 7. 👥 RECURSOS HUMANOS (HRMS - GDPR / ISO 27701)

### Básico (Fundamentos no omitibles)
- [x] **Directorio de Empleados y Contratos:** Gestión de personal en `/equipo`.
- [ ] **Asistencias y Permisos/Vacaciones:** Registro de entradas/salidas y solicitudes de ausencia.
- [ ] **Gastos de Empleados:** Carga de recibos para reembolso.

### Enterprise (Premium / Marketplace)
- [ ] **Nómina Automatizada Localizada:** Cálculo de retenciones fiscales con asientos contables automáticos.
- [ ] **ATS (Sistema de Seguimiento de Candidatos):** Pipeline de reclutamiento con parseo de CVs.
- [ ] **Evaluaciones 360° y OKRs:** Flujos de revisión de desempeño entre pares, jefes y subordinados.
- [ ] **Gestión de Flota e Insumos (Custodia):** Laptops, vehículos y equipos asignados con contratos de responsabilidad.
- [ ] **Planificación de Sucesión:** Mapas de talento para reemplazar puestos clave.

---

## 8. 🛡️ GOBERNANZA, RIESGO Y CUMPLIMIENTO (GRC)

### Básico (Fundamentos no omitibles)
- [x] **RBAC (Control de Acceso por Roles):** Sistema de roles con permisos granulares (`rbac.ts`).
- [x] **Logs de Auditoría:** Registro de actores y acciones en `auditLogger.ts`.
- [ ] **Política de Copias de Seguridad:** Backups automáticos de base de datos con retención configurada.

### Enterprise (Premium / Marketplace)
- [ ] **Segregación de Funciones (SoD):** Bloqueo a nivel sistema para evitar roles conflictivos (crear proveedor + aprobar pago).
- [x] **Cifrado y Aislamiento de Datos Sensibles:** Aislamiento RLS por tenant y llaves de servicio no expuestas.
- [ ] **Logs de Auditoría Inmutables (WORM):** Tablas de auditoría inalterables ni por administradores de BD.
- [ ] **Derecho al Olvido (GDPR):** Anonimización de datos personales preservando integridad histórica contable.
- [ ] **Single Sign-On (SSO) y MFA:** Integración con Google Workspace / Azure AD + 2FA forzado.
- [ ] **Rate Limiting y Protección API:** Prevención de ataques DDoS y throttling de peticiones a la base de datos.
