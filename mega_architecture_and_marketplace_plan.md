# Mega Plan Maestro de Arquitectura, Extensibilidad & Marketplace (SaaSCore ERP)

Este documento especifica la hoja de ruta integral para transformar SaaSCore ERP en una plataforma corporativa internacional de nivel empresarial, altamente escalable y abierta para desarrolladores de la comunidad a través de un **Marketplace de Módulos (Estilo Odoo)**.

---

## ¿Por qué es confiable este enfoque?

Ejecutar el desarrollo bajo un **Mega Plan Maestro** estructurado por fases es la práctica estándar en la ingeniería de software empresarial. Esto garantiza que:
1. **No exista deuda técnica:** Las bases del core nunca se rompen al agregar nuevas funciones.
2. **Compatibilidad para Terceros:** Los desarrolladores externos podrán crear plugins sin tocar el código fuente del ERP.
3. **Ejecución Autónoma Segura:** La IA puede ejecutar cada fase de manera secuencial, verificando la compilación (`npm run build`) y actualizando `roadmap.md` paso a paso.

---

## Pilar 1: Arquitectura de Extensibilidad & Marketplace (Estilo Odoo)

Para que desarrolladores externos vendan o publiquen módulos en el sistema, implementaremos un marco estándar de plugins:

### 1.1 Manifest de Módulo (`plugin.json`)
Cada módulo o plugin contendrá un manifiesto estandarizado:
```json
{
  "id": "ve-tax-igtf",
  "name": "Venezuela Fiscal & IGTF Extension",
  "version": "1.0.0",
  "author": "SaaSCore Community",
  "category": "Fiscal / Localization",
  "minCoreVersion": "1.0.0",
  "slots": ["checkout_summary", "invoice_footer", "settings_tab"],
  "events": ["sale.completed", "payment.recorded"]
}
```

### 1.2 Inyección de Slots UI (`UISlot.tsx`)
Puntos de extensión dinámicos donde los plugins pueden renderizar componentes sin modificar las páginas principales:
- `header_actions`: Botones adicionales en la barra superior.
- `sidebar_menu`: Módulos o submenús personalizados.
- `checkout_summary`: Impuestos especiales o recargos en el POS.
- `invoice_footer`: Leyendas legales o QR fiscales.

### 1.3 Marketplace Store UI (`/configuracion/plugins`)
- Catálogo visual de aplicaciones disponibles (Gratuitas y Premium).
- Botones de instalación/desactivación en 1-clic con persistencia en la tabla `tenant_plugins`.

---

## Pilar 2: Motor Bimoneda & Multidivisa Avanzado (NIIF/IFRS)

- **Sincronización de Tasas:** Consultas automáticas de tasas oficiales (BCV, Banxico, BanRep) con almacenamiento en la tabla `exchange_rates`.
- **Congelado de Tasa (Tax & Legal Audit):** Registro inmutable de la tasa y el monto equivalente en moneda local (`total_local`) al momento exacto de emitir cada factura.
- **Revaluación de Cuentas por Cobrar:** Ajuste por diferencia en cambio al cerrar el mes contable.

---

## Pilar 3: CRM Avanzado & Cuentas por Cobrar (Cobranza Activa)

- **Pestaña de Morosidad & Saldos:** Vista detallada en `/clientes` mostrando saldo total adeudado, días de mora y límite de crédito.
- **Cobro de Abonos 1-Clic:** Modal para abonar a una o varias facturas pendientes con generación automática del comprobante de abono.
- **Partida Doble Automática:** 
  - Débito: *Caja / Bancos*
  - Crédito: *Cuentas por Cobrar (Clientes)*
- **Estados de Cuenta PDF/Excel:** Descarga de historial de facturas y pagos del cliente.

---

## Pilar 4: Reportes Financieros & Inteligencia de Negocio

- **Estado de Resultados (P&L - Ganancias y Pérdidas):** Comparativa entre Ingresos por Ventas vs Costos de Ventas y Gastos Operativos en rangos de fecha seleccionables.
- **Balance de Comprobación y Cuadre de Caja Diario:** Resumen consolidado para auditoría contable.
- **Motor de Exportación:** Generador de reportes en archivos planos **Excel (`.xlsx` / `.csv`)** y **PDF Corporativo**.

---

## Pilar 5: Comunicación en Tiempo Real (WhatsApp Cloud API)

- **Meta WhatsApp Cloud API / Twilio Integration:** Sustitución de logs simulados por envío real vía API de WhatsApp.
- **Disparadores Automáticos:**
  - Envío automático de factura en PDF al presionar "Cobrar" en la Caja.
  - Avisos de cobro y recordatorio de facturas por vencer.
  - Confirmación de citas en el calendario.

---

## Pilar 6: Infraestructura de Producción & Script SQL Definitivo (`schema_v1.sql`)

- **Transacciones ACID Concurrencia:** Bloqueos optimistas para descontar stock en ventas masivas simultáneas.
- **Script `schema_v1.sql`:** Script SQL completo e idempotente conteniendo:
  - Tablas: `tenants`, `user_tenants`, `entities`, `items`, `documents`, `document_lines`, `audit_logs`, `journal_entries`, `journal_lines`, `exchange_rates`, `tenant_plugins`.
  - Llaves foráneas con restricciones de integridad (`ON DELETE RESTRICT`).
  - Índices de alto rendimiento en `tenant_id`, `created_at`, `status` y `type`.
  - Políticas RLS (Row Level Security) para aislamiento total de empresas.

---

## Fases de Ejecución Secuencial Autónoma

```
[ FASE 1: Motor Bimoneda & Guardián Multi-Tenant ] ---> COMPLETADA ✓
[ FASE 2: Cuentas x Cobrar & Reportes Financieros (P&L + Excel) ] ---> EN PROGRESO
[ FASE 3: Slots de Extensibilidad UI & Marketplace de Módulos ]
[ FASE 4: WhatsApp Cloud API Real & Webhooks ]
[ FASE 5: Script SQL `schema_v1.sql` & Auditoría Final ISO 27001 ]
```
