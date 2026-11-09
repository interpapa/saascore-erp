---
name: enterprise-team
description: Protocolo corporativo de orquestación multi-agente para proyectos de software. Coordina 5 Squads especializados (Estrategia, Salud & Negocio, Ingeniería, Seguridad & Calidad, Crecimiento, Partners & Academia) inspirados en SAP y Odoo con compuerta de dos vías, rebote autónomo y optimización radical de tokens.
---

# 🏢 Protocolo Corporativo: Enjambre Multi-Agente Rendo ERP (Estándar SAP & Odoo)

Este protocolo estandariza la operación del software bajo el estándar de gobernanza de **SAP, Odoo, Stripe y Salesforce**, adaptado para ejecución autónoma mediante Antigravity.

---

## 1. La Matriz de los 5 Squads Corporativos

| Squad | Misión | Miembros Clave | Regla de Código |
| :--- | :--- | :--- | :--- |
| **Squad 1: Estrategia & Dirección** | Visión de alto nivel, Gap Analysis ("Configuración antes que Personalización") y marco legal. | `ceo-orchestrator`, `cpo-product`, `consultor-funcional-erp`, `abogado-saas` | Define el alcance y requerimientos PRD. |
| **Squad 2: Salud & Negocio** | Fichas Técnicas clínicas, protocolos médicos, reglas contables NIIF y localización fiscal. | `director-medico`, `especialista-odontologia`, `auditor-contable-niif`, `localizador-fiscal-latam` | **PROHIBIDO tocar código.** Entregan solo especificaciones. |
| **Squad 3: Ingeniería & Migraciones** | Implementación ágil, transacciones ACID y migraciones aditivas de BD sin downtime. | `lead-backend`, `lead-frontend`, `upgrade-migration-bot` | Escriben código con contexto quirúrgico. |
| **Squad 4: Seguridad & Calidad** | Compuerta de calidad, blindaje Anti-IDOR y pruebas 100% verdes. | `ciberseguridad-zerotrust`, `qa-tester`, `integrador-intermodular` | **Poder de veto absoluto.** Nada pasa sin 17/17 tests. |
| **Squad 5: Crecimiento, Partners & Academia** | Adquisición, red de revendedores (RevShare), soporte y manuales interactivos de 1 página. | `partner-ecosystem-lead`, `academia-onboarding-lms`, `growth-copywriter`, `customer-success` | Genera documentación, manuales y modelos de alianzas. |

---

## 2. El Ciclo de Dos Vías (Two-Way Feedback Loop)

```
[Usuario / Dirección General]
            │
            ▼
[Fase 1: Squad 1 & 2 - Gap Analysis & Ficha Técnica]
(Consultor Funcional evalúa configuración nativa; Médico / Fiscal definen fórmulas)
            │
            ▼
[Fase 2: Squad 3 - Implementación en Workspace]
(Lead Backend & Lead Frontend codifican respetando la Ficha Técnica)
            │
            ▼
[Fase 3: Squad 4 - Compuerta de Calidad & Rebote Autónomo]
┌────────────────────────────────────────────────────────┐
│ QA Tester ejecuta 'npm run test:runner' + 'build'.     │
│ - ¿Falla algún test o build?                           │
│   ➔ Rebote directo al programador con log exacto.      │
│   ➔ Desarrollador auto-repara y reenvía a QA.          │
│ - ¿17/17 Suites Verdes + Build Verde?                  │
│   ➔ Integrador valida interoperabilidad entre módulos. │
└────────────────────────────────────────────────────────┘
            │
            ▼
[Fase 4: Consolidación & Entrega al Usuario]
(CEO entrega reporte con trazabilidad limpia)
```

---

## 3. Protocolo de Ahorro Radical de Tokens (JIT Context)

1. **Punteros sobre Payloads:**  
   Nunca transferir archivos completos en mensajes de agentes. Usar enlaces de rango `file:///path/to/file#L10-L40`. El receptor lee solo las líneas a modificar.
2. **Model Tiering:**  
   - Modelos `pro` / `inherit`: CEO, Consultor Funcional, Director Médico, Auditor Contable NIIF, Abogado SaaS.
   - Modelos `flash` / `flash_lite`: QA Tester, validadores de sintaxis, análisis de logs y generadores de plantillas.
3. **Memoria Común por Artefactos:**  
   Los esquemas y manuales viven en archivos markdown de disco en `.agents/` o artifacts de sesión, eliminando la necesidad de reinyectar 100k tokens en cada turno.
4. **Descarte de Contexto Transitorio:**  
   Al completar una tarea, el hilo secundario se cierra y el CEO solo recibe el commit hash y el resumen de pruebas.

---

## 4. Estándar de Comunicación: El "Task Memo"

Toda comunicación inter-agente debe usar el formato estructurado:
```json
{
  "task_id": "TASK-2026-X",
  "from": "ceo-orchestrator",
  "to": "lead-backend",
  "priority": "HIGH",
  "action": "IMPLEMENT",
  "context_pointers": ["file:///src/app/actions/items.ts#L420-L480"],
  "acceptance_criteria": [
    "npm run test:runner debe dar 17/17 suites verdes",
    "Esquema aditivo: prohibido DROP/RENAME COLUMN"
  ]
}
```
