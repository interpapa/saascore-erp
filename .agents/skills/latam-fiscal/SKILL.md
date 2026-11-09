---
name: latam-fiscal
description: Reglas de localización tributaria y matemática bimoneda ($ USD y Bs VES) de Rendo ERP. Cubre SENIAT (Venezuela), DIAN (Colombia), SAT (México), exenciones del sector salud, IGTF (3%) y cálculo de cambio oficial con tasa BCV y Decimal.js.
---

# ⚖️ Skill: Localización Fiscal LATAM & Matemáticas Bimoneda (Rendo ERP)

Esta habilidad proporciona las fórmulas fiscales y los estándares de cumplimiento tributario para los módulos comerciales y financieros de Rendo ERP.

---

## 1. Regla de Oro: Impuestos Desactivados por Defecto (Opt-In)

En Rendo ERP, **la configuración tributaria viene inactiva por defecto (`taxes_enabled: false`, tasa 0%)**.
* **Motivo:** Los servicios médicos, consultorios odontológicos y micro-comercios operan mayoritariamente bajo régimen exento o simplificado.
* **Activación:** Solo si el negocio activa el switch en `/configuracion`, Caja POS habilitará el desglose de IVA y el selector de Factura Fiscal.

---

## 2. Parámetros Regionales por País

| Región | Ente Regulador | Tasa IVA General | Particularidades de Rendo ERP |
| :--- | :--- | :---: | :--- |
| **`exento_salud`** | N/A | **0%** | Por defecto para clínicas, consultas médicas y terapias exentas. |
| **`ve_seniat`** | SENIAT (Venezuela) | **16%** | Bimoneda USD/VES, tasa BCV diaria, soporte opcional de IGTF (3%) en pagos en divisas. |
| **`co_dian`** | DIAN (Colombia) | **19%** | Facturación electrónica y resoluciones numéricas. |
| **`mx_sat`** | SAT (México) | **16%** | CFDI y catálogo de usos fiscales. |
| **`personalizado`**| Libre | Manual | Tasa libremente configurable por el usuario. |

---

## 3. Manejo Bimoneda y Prevención de Errores con `Decimal.js`

En entornos con alta inflación y tipos de cambio flotantes (como Venezuela con tasa BCV):
1. **El precio maestro se almacena siempre en USD (`base_price`).**
2. La conversión a moneda local (Bolívares / VES) se calcula en vivo:
   $$\text{Monto VES} = \text{Monto USD} \times \text{Tasa BCV}$$
3. **Cero errores de coma flotante:**
   NUNCA usar operaciones nativas de JavaScript con `Math.round()` que generen discrepancias de céntimos ($0.1 + 0.2 \ne 0.3$). Usar redondeo a 2 decimales para totales y 4 decimales para costos unitarios.

---

## 4. Reglas del IGTF (Impuesto a las Grandes Transacciones Financieras)
* Aplica exclusivamente sobre el porcentaje de la cuenta pagado en **divisas en efectivo** o **medios electrónicos internacionales** (Zelle, tarjeta internacional):
  $$\text{IGTF} = \text{Monto Pagado en Divisas} \times 0.03$$
* Los pagos en moneda nacional (Bolívares vía Pago Móvil, Punto de Venta nacional o Transferencia bancaria) están **100% exentos de IGTF**.
