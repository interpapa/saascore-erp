# Benchmark de Clase Mundial: SAP S/4HANA & Odoo 17 vs. SaaSCore ERP

Este documento establece la comparativa profunda entre los líderes globales de ERP (SAP S/4HANA y Odoo 17) y la arquitectura de **SaaSCore ERP**. Define el roadmap funcional para elevar cada uno de los 6 módulos a estándar de corporación internacional.

---

## Comparativa Funcional de los 6 Módulos ERP

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              MAPA MODULAR ENTERPRISE (6 DOMINIOS)                           │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│ 1. Ventas & CRM │ 2. WMS Inventario│ 3. Contabilidad │ 4. HRMS Nómina  │ 5. Compras      │ 6. MRP Fábrica  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

### 1. Ventas y CRM (Customer Relationship Management)

- **Benchmark SAP S/4HANA & Odoo 17:**
  - *Básico:* Embudo de ventas, catálogo, cotizaciones y conversión a facturas.
  - *Avanzado:* Portal B2B para clientes con firma digital, listas de precios dinámicas (por volumen/grupo), suscripciones/MRR con cobro recurrente, scoring predictivo de leads.
- **Estado Actual en SaaSCore:**
  - Módulo CRM `/clientes`, checkout en POS `/caja`, facturación bimoneda con snapshots inmutables.
- **Plan de Mejoras Avanzadas para SaaSCore:**
  - [ ] **Portal B2B del Cliente (`/portal/[token]`):** Acceso privado para clientes donde consultan sus facturas, ven su estado de cuenta y pagan/abonan en línea.
  - [ ] **Listas de Precios Dinámicas:** Soporte para tarifas A/B/C (Mayorista, Detal, VIP) en `items.metadata`.
  - [ ] **Facturación Recurrente (Suscripciones):** Generador automático de facturas periódicas para modelos SaaS o contratos de mantenimiento.

---

### 2. Inventario y Almacén (WMS - Warehouse Management System)

- **Benchmark SAP S/4HANA & Odoo 17:**
  - *Básico:* Entradas, salidas, kardex y stock mínimo.
  - *Avanzado:* Rutas inteligentes (Cross-docking, Dropshipping), estrategias de retiro (FIFO, LIFO, FEFO), trazabilidad por Lotes y Números de Serie, Puntos de Reorden Automáticos (Min/Max), Costeo Promedio Ponderado (AVCO) con impacto contable en tiempo real.
- **Estado Actual en SaaSCore:**
  - Stock simple en `items.stock_quantity`, descuento atómico en ventas.
- **Plan de Mejoras Avanzadas para SaaSCore:**
  - [ ] **Costeo Promedio Ponderado (AVCO):** Recálculo automático del costo unitario al recibir compras, actualizando la cuenta contable de inventario.
  - [ ] **Trazabilidad por Lotes & Vencimiento (FEFO):** Registro de lotes y fechas de expiración en productos perecederos/médicos.
  - [ ] **Reabastecimiento Automático (Min/Max):** Alertas y sugerencias automáticas de compra cuando el stock cruza el punto crítico.

---

### 3. Contabilidad y Finanzas (El Núcleo NIIF/IFRS)

- **Benchmark SAP S/4HANA & Odoo 17:**
  - *Básico:* Plan contable, libro mayor, cuentas por cobrar/pagar y asientos.
  - *Avanzado:* Contabilidad Analítica (Centros de Costo / Proyectos), Consolidación Multi-Empresa con Revaluación de Diferencia en Cambio, Conciliación Bancaria automática, Tablas de Depreciación de Activos Fijos, Ingresos/Gastos Diferidos (NIIF 15).
- **Estado Actual en SaaSCore:**
  - Partida doble en `accountingEngine.ts`, congelado bimoneda en `currencyEngine.ts`, libro diario en `/contabilidad`.
- **Plan de Mejoras Avanzadas para SaaSCore:**
  - [ ] **Contabilidad Analítica (Centros de Costo):** Etiquetado de líneas contables por departamento o proyecto.
  - [ ] **Revaluación por Diferencia en Cambio:** Ajuste mensual de cuentas por cobrar/pagar según variación de la tasa oficial.
  - [ ] **Gestión de Activos Fijos:** Tablas de depreciación automática mensual con asiento contable directo.

---

### 4. Recursos Humanos y Nómina (HRMS - GDPR / ISO 27701)

- **Benchmark SAP S/4HANA & Odoo 17:**
  - *Básico:* Directorio de empleados, contratos, ausencias y asistencias.
  - *Avanzado:* Nómina Localizada con cálculo de retenciones/impuestos conectados a contabilidad, Evaluaciones de Desempeño 360°, Reclutamiento ATS (Pipeline de candidatos), Asignación y Responsabilidad de Activos Corporativos (vehículos, laptops).
- **Estado Actual en SaaSCore:**
  - Entidades de tipo `employee` en `/equipo`, generación de recibos en `payroll.ts`.
- **Plan de Mejoras Avanzadas para SaaSCore:**
  - [ ] **Nómina Localizada Avanzada:** Cálculo automático de deducciones de ley y retenciones integradas a la partida doble.
  - [ ] **Asignación de Activos Corporativos:** Registro de laptops, vehículos y herramientas entregadas al personal con contrato de custodia.

---

### 5. Compras (Procurement)

- **Benchmark SAP S/4HANA & Odoo 17:**
  - *Básico:* Órdenes de compra (PO), recepción de mercancía y facturas de proveedor.
  - *Avanzado:* Licitaciones (RFQ multi-proveedor con comparativa), Acuerdos Marco (Blanket Orders), Lectura OCR de facturas de proveedor, Inspección de Control de Calidad (QC).
- **Estado Actual en SaaSCore:**
  - Módulo `/compras`, gestión de proveedores (`SupplierModal`) y Órdenes de Compra (`PurchaseOrderModal`).
- **Plan de Mejoras Avanzadas para SaaSCore:**
  - [ ] **Licitaciones de Compra (RFQ Multi-Proveedor):** Emisión de solicitudes de cotización a varios proveedores con cuadro comparativo.
  - [ ] **Control de Calidad (QC Recepción):** Estado de inspección previa antes de habilitar el stock para la venta.

---

### 6. Producción (MRP - Material Requirements Planning)

- **Benchmark SAP S/4HANA & Odoo 17:**
  - *Básico:* Lista de materiales (BOM) y órdenes de trabajo simples.
  - *Avanzado:* Planificación de Capacidad (OEE), BOM Multinivel & Subcontratación, Control de Versiones de Ingeniería (PLM), Mantenimiento Preventivo de maquinaria.
- **Estado Actual en SaaSCore:**
  - Gestión básica de órdenes de trabajo (`work_order`) en `/calendario`.
- **Plan de Mejoras Avanzadas para SaaSCore:**
  - [ ] **Lista de Materiales (BOM - Bill of Materials):** Definición de componentes requeridos para ensamblar un producto en `items.metadata`.
  - [ ] **Explosión de Insumos & Orden de Producción:** Descuento automático de materia prima al procesar una orden de fabricación.
