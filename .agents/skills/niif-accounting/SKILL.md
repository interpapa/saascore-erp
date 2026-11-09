---
name: niif-accounting
description: Motor y reglas de contabilidad internacional NIIF y partida doble en Rendo ERP. Plan de cuentas estandarizado (1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingreso, 5 Costo, 6 Gasto), generación automática de asientos en journal_entries y conciliación de caja POS.
---

# 📊 Skill: Motor Contable NIIF & Partida Doble (Rendo ERP)

Esta habilidad proporciona los estándares contables y las reglas matemáticas para que toda transacción financiera en Rendo ERP quede respaldada por un asiento contable balanceado.

---

## 1. El Principio Fundamental de Partida Doble
Toda transacción económica debe cumplir la ecuación fundamental de la contabilidad:
$$\sum \text{Débitos} = \sum \text{Créditos}$$
Ningún asiento contable (`journal_entries`) puede guardarse si la diferencia entre débitos y créditos es mayor a $0.00$.

---

## 2. Catálogo Oficial de Cuentas (Plan Único de Cuentas Rendo)

| Código | Nombre de la Cuenta | Naturaleza | Uso en Rendo ERP |
| :--- | :--- | :---: | :--- |
| **`1.1.01.01`** | Caja Principal - Efectivo ($ USD) | Deudora | Ingreso y egreso de efectivo físico en caja. |
| **`1.1.01.02`** | Bancos - Pago Móvil / Transferencias | Deudora | Cobros por canales bancarios y electrónicos. |
| **`1.1.02.01`** | Cuentas por Cobrar Comerciales | Deudora | Ventas a crédito de clientes en POS o CRM. |
| **`1.1.04.01`** | Inventario de Mercancías | Deudora | Activo de productos físicos comprados. |
| **`2.1.01.01`** | Cuentas por Pagar Proveedores | Acreedora | Facturas de compra recibidas a crédito. |
| **`2.1.02.01`** | Débito Fiscal IVA por Pagar | Acreedora | IVA facturado en ventas fiscales. |
| **`4.1.01`** | Ingresos por Ventas de Mercancías | Acreedora | Ingreso neto por venta de productos de inventario. |
| **`4.1.02`** | Ingresos por Servicios Clínicos | Acreedora | Ingreso neto por consultas y procedimientos médicos. |
| **`5.1.01`** | Costo de Ventas | Deudora | Costo de adquisición de la mercancía despachada. |

---

## 3. Matriz de Asientos Automáticos por Evento

### A. Venta en Caja de Mostrador (Pago Mixto con IVA)
* **Débito:** `1.1.01.01` Caja Efectivo (monto en efectivo)
* **Débito:** `1.1.01.02` Bancos Pago Móvil (monto bancario)
* **Crédito:** `4.1.01` Ingresos por Ventas (Subtotal neto sin IVA)
* **Crédito:** `2.1.02.01` Débito Fiscal IVA por Pagar (Monto exacto del IVA)

### B. Venta a Crédito en POS
* **Débito:** `1.1.02.01` Cuentas por Cobrar Comerciales (Total)
* **Crédito:** `4.1.01` Ingresos por Ventas (Total)

### C. Recepción de Compra de Mercancía (`/compras` ➔ `/inventario`)
* **Débito:** `1.1.04.01` Inventario de Mercancías (Costo total)
* **Crédito:** `1.1.01.02` Bancos o `2.1.01.01` Cuentas por Pagar

---

## 4. Cuadre y Arqueo de Caja POS (`cashRegister.ts`)
Al cerrar turno en `/caja`:
$$\text{Diferencia} = \text{Saldo Físico Contado} - \text{Saldo Esperado por Sistema}$$
* Si $\text{Diferencia} > 0$: Sobrante de caja.
* Si $\text{Diferencia} < 0$: Faltante de caja.
* Si $\text{Diferencia} = 0$: Turno cuadrado al centavo.
