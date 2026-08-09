# Plan Maestro de Ejecución: Arquitectura, Fases y Extensibilidad Internacional (SaaSCore ERP)

Este documento constituye la especificación definitiva y detallada del proyecto SaaSCore ERP. Describe la arquitectura del Kernel, el motor de extensibilidad (estilo Odoo), los estándares internacionales aplicados y el desglose paso a paso de las 6 fases de desarrollo.

---

## 1. Visión y Planteamiento del Sistema

El objetivo central de SaaSCore ERP es proporcionar una plataforma corporativa internacional de nivel empresarial que combine dos cualidades usualmente opuestas:
1. **Un Core Inviolable y Auditable:** Que garantice el cumplimiento de normas **NIIF/IFRS** (contabilidad de partida doble inmutable sin `DELETE`), **GDPR / ISO 27701** (privacidad y RBAC en RRHH), **ISO 9001** (trazabilidad de inventario) e **ISO 27001** (seguridad Zero-Trust).
2. **Libertad Total de Extensión y Personalización (Estilo Odoo):** Que permita a nosotros, a nuestros clientes y a desarrolladores externos de la comunidad crear módulos, personalizar interfaces, añadir campos sin alterar tablas y publicar aplicaciones en nuestro **Marketplace**, sin tocar una sola línea del código fuente del ERP.

---

## 2. Los 3 Pilares Fundamentales de la Arquitectura

```
                        ┌─────────────────────────────────────────────────────────────┐
                        │                ARQUITECTURA DE SAASCORE ERP                 │
                        └──────────────────────────────┬──────────────────────────────┘
                                                       │
        ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
        ▼                                              ▼                                              ▼
┌───────────────────────────────┐            ┌───────────────────────────────┐            ┌───────────────────────────────┐
│     PILAR A: KERNEL CORE      │            │  PILAR B: MOTOR EXTENSIBLE    │            │    PILAR C: RESILIENCIA      │
├───────────────────────────────┤            ├───────────────────────────────┤            ├───────────────────────────────┤
│ • TenantSecurity (Multi-Tenant)│            │ • Slots UI (`UISlot.tsx`)     │            │ • Sandbox Execution Guard     │
│ • LedgerService (NIIF Partida)│            │ • JSONB Zod Metadata Registry │            │ • Transacciones ACID Stock    │
│ • TaxCurrencyEngine (Bimoneda)│            │ • EventBus & Action Hooks     │            │ • Audit Trail Inmutable       │
│ • AuditLogger (Trazabilidad)  │            │ • Marketplace App Store       │            │ • Rate Limiting & RLS Isolation│
└───────────────────────────────┘            └───────────────────────────────┘            └───────────────────────────────┘
```

---

## 3. Desglose Exhaustivo de las 6 Fases de Desarrollo

### FASE 1: Motor Bimoneda & Guardián Multi-Tenant (ESTADO: COMPLETADA ✓)
- **Logros:**
  - Implementación del motor bimoneda con `Decimal.js` (`currencyEngine.ts`).
  - Congelado inmutable de tasa de cambio oficial (ej. BCV/USD) y total en moneda local (`total_local`) al segundo exacto de la emisión de cada factura.
  - Guardián Multi-Tenant en servidor (`tenantSecurity.ts`) integrado en todos los Server Actions.
  - Renderizado bimoneda en el Punto de Venta (`/caja`) y en las Facturas Imprimibles (`InvoicePrintView.tsx`).
  - Verificación limpia de TypeScript y Next.js en las 24 rutas del proyecto.

---

### FASE 2: Kernel Services, Slots UI & Atributos Dinámicos Zod (ESTADO: EN PROGRESO)
- **Objetivo:** Construir la infraestructura de aislamiento y personalización del ERP.
- **Componentes a Implementar:**
  1. **Estructura de Kernel Services (`src/lib/core/kernel/`):**
     - Centralizar las llamadas contables y fiscales en clases de servicio puras (`LedgerKernel`, `TaxKernel`, `SecurityKernel`).
  2. **Motor de Slots de Interfaz (`UISlot.tsx`):**
     - Componente declarativo que permite renderizar widgets de plugins en ubicaciones estratégicas:
       - `customer_form_extra`: Campos adicionales en el formulario del cliente.
       - `pos_totals_bottom`: Avisos, propinas o recargos en la caja.
       - `invoice_header`: Encabezados o leyendas legales.
  3. **Registro de Atributos Dinámicos (Zod Metadata Registry):**
     - Permitir añadir campos personalizados en la columna `metadata` (JSONB) sin modificar el esquema de tablas SQL (`ALTER TABLE`), validados con esquemas Zod en tiempo de ejecución.
  4. **Sandbox Execution Guard:**
     - Envoltorio de captura de excepciones que aísla la ejecución de plugins de terceros para evitar que un error en una extensión tumbe el sistema o altere la contabilidad.

---

### FASE 3: Cuentas por Cobrar (CRM), Cobranza Activa & Reportes Financieros P&L
- **Objetivo:** Otorgar control financiero total sobre las ventas a crédito y proporcionar inteligencia de negocios exportable.
- **Componentes a Implementar:**
  1. **Pestaña de Cuentas por Cobrar en `/clientes`:**
     - Tabla interactiva de clientes con facturas pendientes, saldos adeudados y días de mora.
     - Modal de **Cobro de Abono 1-Clic**: Selección de factura, monto a abonar y método de pago.
     - Asiento contable de partida doble automático:
       - *Débito:* Caja / Bancos
       - *Crédito:* Cuentas por Cobrar (Clientes)
  2. **Estado de Resultados (P&L - Ganancias y Pérdidas):**
     - Informe financiero en `/contabilidad` comparando Ingresos por Ventas vs. Costos y Gastos en períodos configurables.
  3. **Motor de Exportación Corporativo:**
     - Descarga de reportes contables y estados de cuenta en formatos planos **Excel (`.xlsx` / `.csv`)** y **PDF Imprimible**.

---

### FASE 4: Slots de Extensibilidad UI & Marketplace de Módulos (Estilo Odoo Apps Store)
- **Objetivo:** Permitir la monetización y distribución de módulos creados por nosotros y por desarrolladores de la comunidad.
- **Componentes a Implementar:**
  1. **Estandarización de `plugin.json` / `manifest.ts`:**
     - Especificación de metadatos, versión mínima del Core, slots requeridos y eventos escuchados.
  2. **Tienda y Gestor Visual de Módulos (`/configuracion/plugins`):**
     - Catálogo UI de módulos (Gratuitos y Premium) con estado de instalación, activación/desactivación en 1-clic y persistencia en la tabla `tenant_plugins`.
  3. **Event Hooks & Filters Engine:**
     - Sistema de filtros para modificar valores (ej. descuentos de temporada) y eventos de acción desacoplados.

---

### FASE 5: Comunicación en Tiempo Real (WhatsApp Cloud API Real & Webhooks)
- **Objetivo:** Automatizar la comunicación omnicanal con clientes y proveedores.
- **Componentes a Implementar:**
  1. **Conexión a Meta WhatsApp Cloud API / Twilio:**
     - Reemplazar la simulación de WhatsApp por una integración Webhook real con credenciales cifradas por tenant.
  2. **Disparadores de Mensajería Automática:**
     - Envío del comprobante PDF de la factura al cerrar la venta en la caja.
     - Recordatorio automático de facturas vencidas o próximas a vencer.
     - Notificación y confirmación de citas de servicio en el calendario.

---

### FASE 6: Infraestructura de Producción, Concurrencia ACID & Script `schema_v1.sql`
- **Objetivo:** Dejar el proyecto 100% empaquetado y listo para recibir miles de empresas concurrentes.
- **Componentes a Implementar:**
  1. **Script SQL Definitivo e Idempotente (`schema_v1.sql`):**
     - Definición limpia de tablas: `tenants`, `user_tenants`, `entities`, `items`, `documents`, `document_lines`, `audit_logs`, `journal_entries`, `journal_lines`, `exchange_rates`, `tenant_plugins`.
     - Llaves foráneas con restricciones de integridad (`ON DELETE RESTRICT`).
     - Índices de alta concurrencia en `tenant_id`, `created_at`, `type` y `status`.
     - Políticas de seguridad Row-Level Security (RLS) para aislamiento multi-tenant absoluto en PostgreSQL.
  2. **Control de Concurrencia ACID en Inventario:**
     - Transacciones atómicas de actualización de stock para evitar descuadres en ventas simultáneas masivas.
  3. **Auditoría Final ISO 27001:**
     - Escaneo completo de vulnerabilidades y verificación de sanitización de entradas.

---

## 4. Metodología de Ejecución Autónoma y Garantía de Calidad

Para asegurar un avance fluido y sin errores durante la ejecución autónoma, aplicaremos el siguiente flujo en cada tarea:

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│  1. Lectura Contexto    │ --> │  2. Implementación en   │ --> │  3. Verificación Build  │
│  (roadmap.md)           │     │     Archivos Locales    │     │  (`npm run build`)      │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
                                                                             │
                                                                             ▼
                                                                ┌─────────────────────────┐
                                                                │  4. Actualización de    │
                                                                │     Roadmap & Chat      │
                                                                └─────────────────────────┘
```

1. **Lectura de Contexto:** Antes de iniciar cualquier subtarea, la IA lee `roadmap.md` y `master_execution_blueprint.md`.
2. **Implementación Local:** Código creado y modificado directamente en los archivos del proyecto (sin código suelto en el chat).
3. **Verificación de Compilación:** Ejecución de `npm run build` para garantizar que la aplicación compile limpiamente en Next.js y TypeScript.
4. **Actualización de Contexto:** Marcado de casilla completada en `roadmap.md` y reporte ultra-conciso al usuario.
