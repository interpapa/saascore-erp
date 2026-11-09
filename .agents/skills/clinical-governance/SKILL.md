---
name: clinical-governance
description: Reglas y estándares clínicos de Rendo ERP. Cubre odontograma FDI (11-48 y 51-85), fórmulas fisiológicas (PAM, IMC OMS, edad pediátrica), clasificación CIE-10 y aislamiento de expedientes médicos por especialidad en entities.metadata.specialties_state.
---

# 🩺 Skill: Gobernanza Clínica & Estándares Médicos (Rendo ERP)

Esta habilidad proporciona el conocimiento clínico formal para diseñar y mantener los módulos de salud de Rendo ERP (`/clinica`, `/odontologia`, `/ginecologia`, etc.).

---

## 1. Nomenclatura Odontológica Internacional (FDI / ISO 3950)

En `/odontologia` y en cualquier ficha dental de Rendo, los dientes se numeran estrictamente con dos dígitos según la Federación Dental Internacional (FDI):

```
                       MAXILAR SUPERIOR (Arcada Superior)
      Cuadrante 1 (Superior Derecho)       │      Cuadrante 2 (Superior Izquierdo)
      18 17 16 15 14 13 12 11              │      21 22 23 24 25 26 27 28
      (Temporales: 55 54 53 52 51)         │      (Temporales: 61 62 63 64 65)
───────────────────────────────────────────┼───────────────────────────────────────────
      (Temporales: 85 84 83 82 81)         │      (Temporales: 71 72 73 74 75)
      48 47 46 45 44 43 42 41              │      31 32 33 34 35 36 37 38
      Cuadrante 4 (Inferior Derecho)       │      Cuadrante 3 (Inferior Izquierdo)
                       MANDÍBULA INFERIOR (Arcada Inferior)
```

### Caras Dentales y Estados Clínicos:
* **Caras:** `O` (Oclusal/Incisal), `M` (Mesial), `D` (Distal), `V` (Vestibular/Bucal), `P/L` (Palatino en superior, Lingual en inferior).
* **Estados Permitidos:** `'sano'`, `'caries'`, `'obturado'` (resina/amalgama), `'endodoncia'`, `'corona'`, `'implante'`, `'ausente'`, `'protesis'`.
* **Piezas Supernumerarias:** Numeradas con prefijo especial (ej. `S1`, `S2`) o identificadores `100+`.

---

## 2. Fórmulas Fisiológicas Validadas (`clinicalCalculators.ts`)

1. **Presión Arterial Media (PAM / MAP):**
   $$\text{PAM} = \text{Diastólica} + \frac{\text{Sistólica} - \text{Diastólica}}{3}$$
   * Normal: $70 - 105 \text{ mmHg}$.
   * Alerta crítica: $< 65 \text{ mmHg}$ (hipoperfusión) o $> 110 \text{ mmHg}$ (crisis hipertensiva).

2. **Índice de Masa Corporal (IMC / BMI):**
   $$\text{IMC} = \frac{\text{Peso en kg}}{(\text{Estatura en metros})^2}$$
   * Rangos OMS: $< 18.5$ (Bajo peso), $18.5 - 24.9$ (Normal), $25.0 - 29.9$ (Sobrepeso), $\ge 30.0$ (Obesidad).

3. **Edad Pediátrica Exacta:**
   Calculada en años, meses y días cumplidos a partir de la fecha de nacimiento para dosificación farmacológica exacta (mg/kg/dosis).

---

## 3. Arquitectura del Expediente Médico Aislado

Para evitar colisiones entre especialidades:
* La identidad del paciente vive en la tabla `entities` (`type: 'customer'`).
* Los datos especializados viven en `entities.metadata.specialties_state`:
  ```json
  {
    "med_odontologia": {
      "dental_chart": { "18": { "status": "sano" }, "16": { "status": "caries", "faces": ["O", "M"] } },
      "treatment_plan": []
    },
    "med_ginecologia": {
      "obstetric_formula": { "g": 2, "p": 1, "c": 0, "a": 1 },
      "last_menstrual_period": "2026-02-15"
    }
  }
  ```
* Cada consulta se almacena en `entities.metadata.clinical_encounters` con su `specialtyId` correspondiente. En la interfaz se presenta filtrado por defecto a la especialidad activa.
