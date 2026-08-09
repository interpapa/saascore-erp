# Plan Maestro de Arquitectura: Core Blindado y Motor de Extensibilidad Modular (Estilo Odoo 17)

Este documento especifica la reestructuración profunda de SaaSCore ERP para eliminar las limitaciones actuales, garantizando un **Core Inviolable** y un **Sistema de Módulos Modificables y Personalizables** sin romper las normativas internacionales (NIIF/IFRS, ISO 27001, GDPR).

---

## 1. El Problema Actual vs. La Solución Arquitectónica

| Factor | Estado Limitado Anterior | Arquitectura de Core Blindado + Plugins (Odoo-Style) |
| :--- | :--- | :--- |
| **Personalización** | Modificar código directamente en las páginas del ERP (riesgo de romper parches y actualizaciones). | Extensión vía **Hooks de Acción**, **Filtros de Datos** y **Slots de Interfaz (UI Slots)**. |
| **Campos Personalizados** | Agregar columnas fijas en la base de datos o modificar modales a mano. | Atributos dinámicos en el esquema `metadata` (JSONB) validados con esquemas Zod en tiempo de ejecución. |
| **Garantía Contable/Fiscal** | Vulnerable si un desarrollador altera el cálculo de totales en la UI. | **Imposibilidad de alteración:** Los cálculos fiscales y asientos contables se procesan exclusivamente en el Kernel del servidor. |
| **Resiliencia ante Fallos** | Si una función fallaba, la pantalla completa del ERP arrojaba pantalla blanca. | **Aislamiento Sandbox:** Si un plugin de un tercero arroja error, el Core captura la excepción, desactiva el widget y el ERP sigue operando 100%. |

---

## 2. Capa 1: El Kernel del Core (Inviolable y Centralizado)

El Kernel centraliza los 5 servicios vitales que rigen el ERP internacional. Ningún plugin puede modificar estas reglas de negocio:

```
                          ┌─────────────────────────────────────────┐
                          │         KERNEL CENTRAL DE SAASCORE      │
                          ├─────────────────────────────────────────┤
                          │  1. TenantSecurityService (Multi-Tenant)│
                          │  2. LedgerService (Partida Doble NIIF)  │
                          │  3. TaxCurrencyEngine (Impuestos/Divisas)│
                          │  4. AuditLogger (Trazabilidad Inmutable)│
                          │  5. EventBus (Emisor de Eventos Global) │
                          └────────────────────┬────────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
  [ Módulos Nativos del ERP ]                                     [ Módulos de Terceros / Plugins ]
  (POS, CRM, Compras, RRHH)                                       (Localizaciones, Facturación QR, etc.)
```

1. **`TenantSecurityService`:** Valida la pertenencia relacional del usuario a la empresa en cada transacción.
2. **`LedgerService`:** Ejecuta asientos contables estrictos de partida doble. Prohibido el `DELETE`.
3. **`TaxCurrencyEngine`:** Calcula impuestos (IVA, IGTF, Sales Tax) y sella la tasa de cambio oficial al segundo de facturar.
4. **`AuditLogger`:** Registra cada acción relevante en logs inmutables.
5. **`EventBus`:** Notifica eventos de dominio (`sale.completed`, `payment.recorded`, `stock.changed`).

---

## 3. Capa 2: Motor de Extensibilidad y Personalización sin Toque de Core

Para permitir que programadores propios o de la comunidad modifiquen el ERP a su gusto, se implementan 3 mecanismos estandarizados:

### A. Inyección Dinámica de Interfaz (`UISlot.tsx`)
Puntos estratégicos en la UI donde se renderizan widgets de plugins habilitados:
- `<UISlot name="customer_form_extra" />`: Permite agregar campos personalizados en la ficha del cliente (ej. Número de Expediente Médico, Placa de Vehículo).
- `<UISlot name="pos_totals_bottom" />`: Permite mostrar propinas, retenciones o mensajes legales en la Caja.
- `<UISlot name="invoice_header" />`: Inyección de logotipos de franquicia o números de control fiscal.

### B. Registro de Atributos Dinámicos (`metadataRegistry.ts`)
Sin necesidad de ejecutar alteración de tablas en la base de datos (`ALTER TABLE`), los módulos registran campos extra que se validan automáticamente dentro de la columna JSONB `metadata`:
```typescript
registerCustomField({
  targetEntity: 'customer',
  fieldName: 'codigo_colegiado',
  label: 'Código de Colegiatura',
  type: 'string',
  required: false
});
```

### C. Hooks de Acción y Filtros de Datos (`pluginManager.ts`)
- **Action Hooks (Eventos):** Reaccionar a ventas, pagos o registros sin bloquear el flujo principal.
- **Filter Hooks (Modificación de Valores):** Interceptar valores como descuentos o condiciones comerciales antes de ser procesados por el servidor.

---

## 4. Capa 3: Aislamiento y Tolerancia a Fallos (ISO 27001 & Concurrencia ACID)

1. **Captura y Aislamiento de Errores (Sandbox Execution):**
   Cualquier ejecución de código de terceros se envuelve en un bloque de seguridad:
   ```typescript
   try {
     plugin.execute(context);
   } catch (pluginError) {
     console.error(`[Plugin Exception] ${plugin.id}:`, pluginError);
     writeAuditLog({ action: 'plugin.error', metadata: { pluginId: plugin.id, error: pluginError.message } });
   }
   ```
2. **Concurrencia ACID:** 
   Las actualizaciones de stock e inventario en alta concurrencia utilizan transacciones relacionales atómicas para evitar ventas duplicadas sobre el mismo ítem.

---

## 5. Hoja de Ruta de Implementación de la Nueva Estructura

```
[ PASO 1: Estructurar Kernel Services & Core Contracts ]
                    │
                    ▼
[ PASO 2: Implementar Motor de Slots UI (UISlot.tsx) ]
                    │
                    ▼
[ PASO 3: Implementar Registro de Atributos Dinámicos (JSONB Metadata) ]
                    │
                    ▼
[ PASO 4: Sandbox Guard para ejecución segura de Plugins ]
                    │
                    ▼
[ PASO 5: Migración de Módulos Actuales (CRM, POS, Compras) a la nueva estructura ]
```

---

> [!IMPORTANT]
> Esta arquitectura nos da el equilibrio perfecto: **Un Core Corporativo Internacional 100% Inviolable** + **Total Libertad de Extensión para Desarrolladores y Plugins del Marketplace**.
