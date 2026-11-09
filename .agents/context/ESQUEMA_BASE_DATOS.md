# 🗄️ Esquema Maestro de Base de Datos (PostgreSQL / Supabase)

> **Propósito:** Especificación canónica de las tablas, columnas, restricciones de integridad y campos flexibles (`metadata`) de Rendo ERP.  
> **REGLA DE ORO:** Base de datos compartida entre Producción (`main`) y Desarrollo (`dev`). Todo cambio DEBE ser **aditivo** (`CREATE TABLE`, `ADD COLUMN`). Terminantemente prohibido ejecutar `DROP COLUMN` o `RENAME COLUMN`.

---

## 1. Tablas Maestras del Núcleo Multi-Tenant

### 1. `tenants` (Empresas / Clínicas / Comercios)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`name`** `TEXT NOT NULL`: Nombre comercial de la empresa.
* **`tax_id`** `TEXT`: Cédula jurídica, RIF o NIT.
* **`currency`** `TEXT DEFAULT 'USD'`: Moneda contable principal.
* **`symbol`** `TEXT DEFAULT '$'`: Símbolo de moneda.
* **`country_code`** `TEXT DEFAULT 'VE'`: Código de país ISO.
* **`is_active`** `BOOLEAN DEFAULT TRUE`: Estado de suscripción.
* **`active_modules`** `JSONB DEFAULT '[]'::jsonb`: Array de slugs de módulos habilitados (ej: `["caja", "inventario", "clinica"]`).
* **`metadata`** `JSONB DEFAULT '{}'::jsonb`:
  - `phone`, `address`, `logo_url`: Datos de contacto y branding.
  - `printer_paper_width`: Ancho de ticket POS (`"80mm"` o `"58mm"`).
  - `mobile_dock_modules`: Array de slugs (hasta 3) anclados al dock móvil inferior.
  - `fiscal_settings`: `{ taxes_enabled: boolean, region: string, tax_rate: number, enable_igtf: boolean, igtf_rate: number }`.
  - `tax_rate`: Número (tasa de impuesto general si está habilitada).
* **`created_at`**, **`updated_at`** `TIMESTAMPTZ`

### 2. `user_tenants` (Membresía & RBAC)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`user_email`** `TEXT NOT NULL`
* **`tenant_id`** `UUID REFERENCES tenants(id) ON DELETE CASCADE`
* **`role`** `TEXT DEFAULT 'staff'`: `'owner' | 'manager' | 'seller' | 'technician' | 'superadmin'`
* **`created_at`** `TIMESTAMPTZ`
* **Restricción:** `UNIQUE(user_email, tenant_id)`

---

## 2. Entidades & Catálogo Comercial

### 3. `entities` (Clientes / Pacientes / Proveedores / Empleados)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`tenant_id`** `UUID REFERENCES tenants(id) ON DELETE CASCADE`
* **`type`** `TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'employee', 'lead', 'branch'))`
* **`name`** `TEXT NOT NULL`: Nombre y apellido o razón social.
* **`email`**, **`phone`**, **`tax_id`**, **`address`** `TEXT`
* **`status`** `TEXT DEFAULT 'active'`
* **`deleted_at`** `TIMESTAMPTZ DEFAULT NULL` (Borrado suave / Soft Delete)
* **`metadata`** `JSONB DEFAULT '{}'::jsonb`:
  - *Paciente Médico / Odontológico:*
    - `medical_profile`: `{ bloodType, allergies, chronicConditions, emergencyContact, surgicalHistory }`
    - `clinical_encounters`: Array cronológico de consultas (`ClinicalEncounterRecord[]`) con `specialtyId`, signos vitales, SOAP, CIE-10 y prescripciones.
    - `specialties_state`: Objeto indexado por `specialtyId` con datos avanzados (odontograma FDI, gestograma obstétrico, etc.).
    - `client_records`: Notas rápidas, archivos adjuntos y documentos emitidos.
  - *Financiero / CRM:*
    - `debt_balance`: Saldo deudor acumulado en USD.
    - `payment_terms_days`: Días de crédito concedidos.
* **`created_at`**, **`updated_at`** `TIMESTAMPTZ`

### 4. `items` (Productos de Inventario / Servicios / Procedimientos)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`tenant_id`** `UUID REFERENCES tenants(id) ON DELETE CASCADE`
* **`type`** `TEXT NOT NULL CHECK (type IN ('product', 'service', 'subscription'))`
* **`sku`** `TEXT`: Código de barras o SKU interno.
* **`name`** `TEXT NOT NULL`
* **`description`**, **`category`** `TEXT`
* **`base_price`** `NUMERIC(15, 4) NOT NULL DEFAULT 0.0000`: Precio de venta unitario.
* **`cost`** `NUMERIC(15, 4) NOT NULL DEFAULT 0.0000`: Costo de adquisición o escandallo.
* **`stock`** `INT DEFAULT NULL`: Cantidad física disponible (`NULL` para servicios exentos de inventario).
* **`is_active`** `BOOLEAN DEFAULT TRUE`
* **`deleted_at`** `TIMESTAMPTZ DEFAULT NULL`
* **`metadata`** `JSONB DEFAULT '{}'::jsonb`:
  - `min_stock`: Umbral de alerta para reposición de compras.
  - `is_service`: Booleano para obviar validaciones de inventario.
  - `specialty_id`: Si pertenece a un procedimiento médico específico (`med_odontologia`, etc.).
  - `kardex`: Array histórico de ajustes transaccionales `{ timestamp, type, quantity, reason, actorEmail }`.

---

## 3. Transacciones, POS & Contabilidad NIIF

### 5. `documents` (Facturas / Órdenes de Entrega / Compras)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`tenant_id`** `UUID REFERENCES tenants(id) ON DELETE CASCADE`
* **`entity_id`** `UUID REFERENCES entities(id)`: Cliente o proveedor.
* **`type`** `TEXT NOT NULL CHECK (type IN ('invoice', 'purchase_order', 'quotation'))`
* **`status`** `TEXT DEFAULT 'draft'`: `'draft' | 'issued' | 'paid' | 'cancelled'`
* **`document_number`** `TEXT NOT NULL`: Número correlativo.
* **`subtotal_amount`**, **`tax_amount`**, **`total_amount`** `NUMERIC(15, 2)`
* **`deleted_at`** `TIMESTAMPTZ DEFAULT NULL`
* **`metadata`** `JSONB DEFAULT '{}'::jsonb`:
  - `doc_type`: `'delivery_order'` (sin IVA) o `'fiscal_invoice'` (con IVA).
  - `payments`: Detalle multimétodo `{ cash, card, transfer, mobile_pay, credit }`.
  - `exchange_rate`: Tasa BCV aplicada a la transacción.

### 6. `document_lines` (Líneas de Factura / Ticket)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`document_id`** `UUID REFERENCES documents(id) ON DELETE CASCADE`
* **`item_id`** `UUID REFERENCES items(id)`
* **`description`** `TEXT NOT NULL`
* **`quantity`** `INT NOT NULL DEFAULT 1`
* **`unit_price`** `NUMERIC(15, 4) NOT NULL`
* **`tax_amount`** `NUMERIC(15, 2) NOT NULL DEFAULT 0.00`

### 7. `journal_entries` & `journal_entry_lines` (Libro Mayor NIIF)
* **`journal_entries`**: Encabezado del asiento contable (`entry_date`, `description`, `total_debit`, `total_credit`).
* **`journal_entry_lines`**: Líneas de doble partida (`account_code`, `account_name`, `debit`, `credit`, `description`).
* **Cuentas Principales:**
  - `1.1.01.01`: Caja Principal - Efectivo ($ USD)
  - `1.1.01.02`: Bancos - Transferencias / Pago Móvil (Bs / $)
  - `1.1.02.01`: Cuentas por Cobrar Comerciales (Crédito)
  - `2.1.02.01`: Débito Fiscal IVA por Pagar
  - `4.1.01`: Ingresos por Ventas de Mercancías / Servicios

---

## 4. Agendamiento, Citas & Operaciones

### 8. `appointments` (Agenda de Citas & Turnos)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`tenant_id`** `UUID REFERENCES tenants(id) ON DELETE CASCADE`
* **`employee_id`** `UUID`: Profesional / Doctor que atiende.
* **`client_id`** `UUID REFERENCES entities(id)`: Paciente / Cliente.
* **`service_id`** `UUID REFERENCES items(id)`: Servicio agendado.
* **`start_time`**, **`end_time`** `TIMESTAMPTZ NOT NULL`
* **`status`** `TEXT`: `'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'`
* **`price`** `NUMERIC(12, 2) DEFAULT 0`
* **`notes`**, **`description`** `TEXT`
* **`metadata`** `JSONB DEFAULT '{}'::jsonb`

### 9. `cash_registers` (Sesiones y Arqueo de Caja POS)
* **`id`** `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
* **`tenant_id`** `UUID REFERENCES tenants(id) ON DELETE CASCADE`
* **`opened_by`**, **`closed_by`** `TEXT`: Email del cajero.
* **`opened_at`**, **`closed_at`** `TIMESTAMPTZ`
* **`opening_balance`**, **`closing_balance`**, **`expected_balance`** `NUMERIC(15, 2)`
* **`status`** `TEXT`: `'open' | 'closed'`

---

## 5. Funciones RPC Atómicas de PostgreSQL
* **`decrement_item_stock(p_item_id, p_quantity, p_tenant_id)`**: Bloquea la fila con `FOR UPDATE` y descuenta el stock de manera atómica, impidiendo sobreventas simultáneas.
