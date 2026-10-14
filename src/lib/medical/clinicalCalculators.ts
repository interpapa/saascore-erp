/**
 * Rendo Salud / SaaSCore - Motor de Calculadoras Clínicas Multi-Especialidad
 *
 * Funciones puras y tipadas para soporte a la decisión clínica (CDSS):
 * - Índice de Masa Corporal (IMC / BMI)
 * - Presión Arterial Media (PAM / MAP) y Clasificación AHA
 * - Edad Cronológica Pediátrica Exacta (años, meses, días)
 * - Dosificación Ponderal Pediátrica (mg/kg/día -> ml por toma) + Catálogo Farmacológico
 * - Rueda Obstétrica de Naegele (FUR -> Semanas de Gestación, FPP, Trimestre)
 * - Equivalente Esférico Oftalmológico y Evaluación de Presión Intraocular (PIO)
 */

export type BMICategory =
  | 'Bajo Peso'
  | 'Normal'
  | 'Sobrepeso'
  | 'Obesidad Grado I'
  | 'Obesidad Grado II+';

export interface BMIResult {
  bmi: number;
  category: BMICategory;
  color: string;
}

/**
 * Calcula el Índice de Masa Corporal (IMC) a partir del peso en kg y la estatura en cm.
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return {
      bmi: 0,
      category: 'Normal',
      color: '#64748b',
    };
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Number(rawBmi.toFixed(1));

  if (bmi < 18.5) {
    return { bmi, category: 'Bajo Peso', color: '#38bdf8' };
  }
  if (bmi < 25) {
    return { bmi, category: 'Normal', color: '#10b981' };
  }
  if (bmi < 30) {
    return { bmi, category: 'Sobrepeso', color: '#f59e0b' };
  }
  if (bmi < 35) {
    return { bmi, category: 'Obesidad Grado I', color: '#f97316' };
  }
  return { bmi, category: 'Obesidad Grado II+', color: '#ef4444' };
}

export type AHAStage =
  | 'Normal'
  | 'Elevada'
  | 'HTA Estadio 1'
  | 'HTA Estadio 2'
  | 'Crisis Hipertensiva';

export interface MAPResult {
  map: number;
  ahaStage: AHAStage;
  alert: boolean;
}

/**
 * Calcula la Presión Arterial Media (PAM = PAD + 1/3(PAS - PAD))
 * y clasifica el estadio hemodinámico según las guías AHA/ACC.
 */
export function calculateMAP(systolic: number, diastolic: number): MAPResult {
  if (!systolic || !diastolic || systolic <= 0 || diastolic <= 0) {
    return {
      map: 0,
      ahaStage: 'Normal',
      alert: false,
    };
  }

  const map = Math.round(diastolic + (systolic - diastolic) / 3);

  if (systolic >= 180 || diastolic >= 120) {
    return { map, ahaStage: 'Crisis Hipertensiva', alert: true };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { map, ahaStage: 'HTA Estadio 2', alert: true };
  }
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return { map, ahaStage: 'HTA Estadio 1', alert: true };
  }
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return { map, ahaStage: 'Elevada', alert: false };
  }
  return { map, ahaStage: 'Normal', alert: false };
}

export interface ExactPediatricAgeResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  formatted: string;
}

/**
 * Calcula la edad pediátrica exacta en años, meses y días desde la fecha de nacimiento.
 */
export function calculateExactPediatricAge(
  birthDateStr: string,
  refDate: Date = new Date()
): ExactPediatricAgeResult {
  if (!birthDateStr) {
    return { years: 0, months: 0, days: 0, totalMonths: 0, formatted: 'Sin fecha de nacimiento' };
  }

  const birth = new Date(birthDateStr);
  if (Number.isNaN(birth.getTime()) || birth > refDate) {
    return { years: 0, months: 0, days: 0, totalMonths: 0, formatted: 'Fecha inválida' };
  }

  let years = refDate.getFullYear() - birth.getFullYear();
  let months = refDate.getMonth() - birth.getMonth();
  let days = refDate.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(refDate.getFullYear(), refDate.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

  return {
    years,
    months,
    days,
    totalMonths,
    formatted: parts.join(', '),
  };
}

export interface PediatricDrugCatalogItem {
  id: string;
  name: string;
  category: string;
  doseMgPerKgDay: number;
  isSingleDoseCalculated?: boolean;
  frequencyHours: 6 | 8 | 12 | 24;
  concentrationMgPer5Ml: number;
  presentationLabel: string;
  notes: string;
}

/**
 * Catálogo farmacológico pediátrico de referencia rápida para cálculo ponderal.
 * Nota: `doseMgPerKgDay` expresa los mg/kg/día totales para dividir entre las tomas diarias.
 */
export const PEDIATRIC_DRUGS_CATALOG: PediatricDrugCatalogItem[] = [
  {
    id: 'drug-acetaminofen',
    name: 'Acetaminofén (Paracetamol)',
    category: 'Antipirético / Analgésico',
    doseMgPerKgDay: 60, // 15 mg/kg/dosis cada 6h = 60 mg/kg/día
    frequencyHours: 6,
    concentrationMgPer5Ml: 160,
    presentationLabel: 'Jarabe 160 mg / 5 ml',
    notes: '15 mg/kg/dosis cada 6 horas. Dosis máxima diaria: 75 mg/kg/día (o 4g/día).',
  },
  {
    id: 'drug-ibuprofeno',
    name: 'Ibuprofeno Pediátrico',
    category: 'AINE / Antiinflamatorio / Antipirético',
    doseMgPerKgDay: 30, // 10 mg/kg/dosis cada 8h = 30 mg/kg/día
    frequencyHours: 8,
    concentrationMgPer5Ml: 100,
    presentationLabel: 'Suspensión 100 mg / 5 ml',
    notes: '10 mg/kg/dosis cada 8 horas con alimentos. Evitar en lactantes < 6 meses o deshidratación.',
  },
  {
    id: 'drug-amoxicilina',
    name: 'Amoxicilina / Amoxicilina + Ác. Clavulánico',
    category: 'Antibiótico Betalactámico',
    doseMgPerKgDay: 80, // 80-90 mg/kg/día dividido cada 12h
    frequencyHours: 12,
    concentrationMgPer5Ml: 400,
    presentationLabel: 'Suspensión 400 mg / 5 ml',
    notes: '80-90 mg/kg/día dividido cada 12 horas por 7 a 10 días (Otitis Media Aguda / Sinusitis / Faringoamigdalitis).',
  },
  {
    id: 'drug-azitromicina',
    name: 'Azitromicina Dihidrato',
    category: 'Antibiótico Macrólido',
    doseMgPerKgDay: 10, // 10 mg/kg/día cada 24h
    frequencyHours: 24,
    concentrationMgPer5Ml: 200,
    presentationLabel: 'Suspensión 200 mg / 5 ml',
    notes: '10 mg/kg/día una vez al día (cada 24h) por 3 a 5 días.',
  },
  {
    id: 'drug-loratadina',
    name: 'Loratadina Pediátrica',
    category: 'Antihistamínico H1',
    doseMgPerKgDay: 0.2, // 0.2 mg/kg/día cada 24h
    frequencyHours: 24,
    concentrationMgPer5Ml: 5,
    presentationLabel: 'Jarabe 5 mg / 5 ml (1 mg/ml)',
    notes: '0.2 mg/kg/día cada 24 horas (máximo 5 ml en <30 kg y 10 ml en >30 kg).',
  },
  {
    id: 'drug-prednisolona',
    name: 'Prednisolona Fosfato Sódico',
    category: 'Corticoesteroide Sistémico',
    doseMgPerKgDay: 1.5, // 1 a 2 mg/kg/día dividido cada 12h o 24h
    frequencyHours: 12,
    concentrationMgPer5Ml: 15,
    presentationLabel: 'Solución Oral 15 mg / 5 ml (3 mg/ml)',
    notes: '1 a 2 mg/kg/día por 3 a 5 días (Crisis asmática / Crup laríngeo). Dosis tope: 60 mg/día.',
  },
];

export interface PediatricDosageResult {
  totalDailyMg: number;
  mgPerDose: number;
  mlPerDose: number;
  dosesPerDay: number;
}

/**
 * Calcula la posología pediátrica exacta en mg y ml por toma a partir del peso en kg,
 * dosis ponderal diaria (mg/kg/día), intervalo horario (6, 8, 12 o 24h) y concentración (mg por cada 5 ml).
 */
export function calculatePediatricDosage(
  weightKg: number,
  doseMgPerKgDay: number,
  frequencyHours: 6 | 8 | 12 | 24,
  concentrationMgPer5Ml: number
): PediatricDosageResult {
  if (
    !weightKg ||
    weightKg <= 0 ||
    !doseMgPerKgDay ||
    doseMgPerKgDay <= 0 ||
    !concentrationMgPer5Ml ||
    concentrationMgPer5Ml <= 0
  ) {
    return {
      totalDailyMg: 0,
      mgPerDose: 0,
      mlPerDose: 0,
      dosesPerDay: 24 / (frequencyHours || 24),
    };
  }

  const dosesPerDay = 24 / frequencyHours;
  const totalDailyMg = Number((weightKg * doseMgPerKgDay).toFixed(1));
  const mgPerDose = Number((totalDailyMg / dosesPerDay).toFixed(1));
  const mlPerDose = Number(((mgPerDose * 5) / concentrationMgPer5Ml).toFixed(1));

  return {
    totalDailyMg,
    mgPerDose,
    mlPerDose,
    dosesPerDay,
  };
}

export interface ObstetricWheelResult {
  gestationalWeeks: number;
  gestationalDays: number;
  formattedGA: string;
  fppDateStr: string;
  trimester: 1 | 2 | 3;
  progressPercent: number;
  daysRemaining: number;
}

/**
 * Calcula la Rueda Obstétrica de Naegele a partir de la Fecha de Última Regla (FUR):
 * - Edad Gestacional (Semanas + Días)
 * - Fecha Probable de Parto (FPP = FUR + 280 días)
 * - Trimestre actual (1º, 2º o 3º) y porcentaje de progreso
 */
export function calculateObstetricWheel(
  furDateStr: string,
  refDate: Date = new Date()
): ObstetricWheelResult {
  if (!furDateStr) {
    return {
      gestationalWeeks: 0,
      gestationalDays: 0,
      formattedGA: '0 sem + 0 días',
      fppDateStr: '',
      trimester: 1,
      progressPercent: 0,
      daysRemaining: 280,
    };
  }

  const [y, m, d] = furDateStr.split('-').map(Number);
  if (!y || !m || !d || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return {
      gestationalWeeks: 0,
      gestationalDays: 0,
      formattedGA: 'FUR inválida',
      fppDateStr: '',
      trimester: 1,
      progressPercent: 0,
      daysRemaining: 280,
    };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const furUtc = Date.UTC(y, m - 1, d);
  const refUtc = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());

  const totalElapsedDays = Math.max(0, Math.floor((refUtc - furUtc) / msPerDay));
  const gestationalWeeks = Math.floor(totalElapsedDays / 7);
  const gestationalDays = totalElapsedDays % 7;

  // Regla de Naegele: FUR + 280 días (40 semanas)
  const fppDate = new Date(furUtc + 280 * msPerDay);
  const fppDateStr = fppDate.toISOString().split('T')[0];

  let trimester: 1 | 2 | 3 = 1;
  if (gestationalWeeks >= 28) {
    trimester = 3;
  } else if (gestationalWeeks >= 14) {
    trimester = 2;
  }

  const progressPercent = Math.min(100, Math.max(0, Math.round((totalElapsedDays / 280) * 100)));
  const daysRemaining = Math.max(0, 280 - totalElapsedDays);

  return {
    gestationalWeeks,
    gestationalDays,
    formattedGA: `${gestationalWeeks} sem + ${gestationalDays} ${gestationalDays === 1 ? 'día' : 'días'}`,
    fppDateStr,
    trimester,
    progressPercent,
    daysRemaining,
  };
}

/**
 * Calcula el Equivalente Esférico Oftalmológico: EE = Esfera + (Cilindro / 2).
 */
export function calculateSphericalEquivalent(sphere: number, cylinder: number): number {
  const s = Number.isFinite(sphere) ? sphere : 0;
  const c = Number.isFinite(cylinder) ? cylinder : 0;
  return Number((s + c / 2).toFixed(2));
}

/**
 * Evalúa la Presión Intraocular (PIO) bilateral en mmHg (rango normal fisiológico: 10–21 mmHg)
 * y detecta asimetrías significativas (>3 mmHg entre ambos ojos) o hipertensión ocular (>21 mmHg).
 */
export function evaluateIOP(
  iopRight: number,
  iopLeft: number
): { hasAlert: boolean; message: string } {
  const od = Number(iopRight || 0);
  const oi = Number(iopLeft || 0);

  if (od <= 0 && oi <= 0) {
    return {
      hasAlert: false,
      message: 'Sin registro tonómetrico de PIO.',
    };
  }

  const alerts: string[] = [];

  if (od > 21) {
    alerts.push(`Hipertensión ocular en Ojo Derecho (OD: ${od} mmHg > 21 mmHg)`);
  } else if (od > 0 && od < 10) {
    alerts.push(`Hipotonía ocular en Ojo Derecho (OD: ${od} mmHg < 10 mmHg)`);
  }

  if (oi > 21) {
    alerts.push(`Hipertensión ocular en Ojo Izquierdo (OI: ${oi} mmHg > 21 mmHg)`);
  } else if (oi > 0 && oi < 10) {
    alerts.push(`Hipotonía ocular en Ojo Izquierdo (OI: ${oi} mmHg < 10 mmHg)`);
  }

  if (od > 0 && oi > 0 && Math.abs(od - oi) > 3) {
    alerts.push(`Asimetría tensional interocular significativa (Δ ${Math.abs(od - oi)} mmHg)`);
  }

  if (alerts.length > 0) {
    return {
      hasAlert: true,
      message: `Alerta de Glaucoma / PIO: ${alerts.join(' · ')}. Sugiere gonioscopia, paquimetría y OCT de nervio óptico.`,
    };
  }

  return {
    hasAlert: false,
    message: `PIO bilateral normotensa (OD: ${od} mmHg / OI: ${oi} mmHg — Rango fisiológico 10–21 mmHg).`,
  };
}
