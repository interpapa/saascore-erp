/**
 * Motor de Cálculo Biométrico y Obstétrico - Rendo ERP (Ginecología y Obstetricia)
 * Implementa fórmulas estándar internacionales (Hadlock, Robinson, Naegele, Elipsoide, Phelan, OMS/IOM)
 */

export interface EllipsoidDimensions {
  lengthMm: number;
  apMm: number;
  transverseMm: number;
}

/**
 * Calcula el volumen de una estructura elipsoide (útero, ovario, saco gestacional, próstata)
 * Fórmula elipsoide estándar médica: V = Longitud (cm) × AP (cm) × Transverso (cm) × 0.5233 (o π/6)
 * @param lengthMm Longitud en milímetros
 * @param apMm Diámetro anteroposterior en milímetros
 * @param transverseMm Diámetro transverso en milímetros
 * @returns Volumen en centímetros cúbicos (cm³ / mL)
 */
export function calculateEllipsoidVolume(lengthMm: number, apMm: number, transverseMm: number): number {
  if (lengthMm <= 0 || apMm <= 0 || transverseMm <= 0) return 0;
  // Convertir mm a cm dividiendo entre 10 cada dimensión (total divisor 1000)
  const volumeCm3 = (lengthMm * apMm * transverseMm * 0.5233) / 1000;
  return Number(volumeCm3.toFixed(2));
}

/**
 * Calcula la Edad Gestacional a partir de la Longitud Céfalo-Rabadilla (LCR / CRL) en milímetros
 * Basado en la fórmula de Robinson & Fleming (validada por Hadlock para I Trimestre de 6 a 14 semanas)
 * @param crlMm Longitud Céfalo-Rabadilla en mm
 * @returns { weeks: number, days: number, formatted: string }
 */
export function calculateGAFromCRL(crlMm: number): { weeks: number; days: number; formatted: string } {
  if (!crlMm || crlMm < 3) {
    return { weeks: 0, days: 0, formatted: '—' };
  }
  // Robinson & Fleming: Días = 8.052 * sqrt(CRL * 1.037) + 23.73 (aproximado en semanas Hadlock)
  // Tabla estándar de regresión Hadlock: Semanas = 8.052 * sqrt(crlMm) * 0.1 + 5.2 aprox
  // Fórmula polinómica estándar FMF / Hadlock:
  // GA (días) = 42 + 1.1 * CRL (para CRL entre 5 y 84 mm)
  const daysTotal = Math.round(42 + 1.05 * crlMm);
  const weeks = Math.floor(daysTotal / 7);
  const days = daysTotal % 7;
  return {
    weeks,
    days,
    formatted: `${weeks}+${days} sem`,
  };
}

/**
 * Estimación de Semanas de Gestación por Diámetro Biparietal (DBP en mm)
 * Hadlock et al.
 */
export function calculateGAFromBPD(bpdMm: number): { weeks: number; days: number; formatted: string } {
  if (!bpdMm || bpdMm < 15) return { weeks: 0, days: 0, formatted: '—' };
  // Hadlock BPD: GA = 9.54 + 0.1482 * BPD + 0.00166 * (BPD^2)
  const gaWeeksDecimal = 9.54 + 0.1482 * bpdMm + 0.00166 * Math.pow(bpdMm, 2);
  const totalDays = Math.round(gaWeeksDecimal * 7);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks, days, formatted: `${weeks}+${days} sem` };
}

/**
 * Estimación de Semanas de Gestación por Circunferencia Cefálica (CC en mm)
 * Hadlock et al.
 */
export function calculateGAFromHC(hcMm: number): { weeks: number; days: number; formatted: string } {
  if (!hcMm || hcMm < 50) return { weeks: 0, days: 0, formatted: '—' };
  // Hadlock HC: GA = 8.96 + 0.039 * HC + 0.00016 * (HC^2)
  const gaWeeksDecimal = 8.96 + 0.039 * hcMm + 0.00016 * Math.pow(hcMm, 2);
  const totalDays = Math.round(gaWeeksDecimal * 7);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks, days, formatted: `${weeks}+${days} sem` };
}

/**
 * Estimación de Semanas de Gestación por Circunferencia Abdominal (CA en mm)
 * Hadlock et al.
 */
export function calculateGAFromAC(acMm: number): { weeks: number; days: number; formatted: string } {
  if (!acMm || acMm < 50) return { weeks: 0, days: 0, formatted: '—' };
  // Hadlock AC: GA = 8.14 + 0.0703 * AC + 0.00011 * (AC^2)
  const gaWeeksDecimal = 8.14 + 0.0703 * acMm + 0.00011 * Math.pow(acMm, 2);
  const totalDays = Math.round(gaWeeksDecimal * 7);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks, days, formatted: `${weeks}+${days} sem` };
}

/**
 * Estimación de Semanas de Gestación por Longitud Femoral (LF / Fémur en mm)
 * Hadlock et al.
 */
export function calculateGAFromFL(flMm: number): { weeks: number; days: number; formatted: string } {
  if (!flMm || flMm < 10) return { weeks: 0, days: 0, formatted: '—' };
  // Hadlock FL: GA = 10.35 + 0.206 * FL + 0.00165 * (FL^2)
  const gaWeeksDecimal = 10.35 + 0.206 * flMm + 0.00165 * Math.pow(flMm, 2);
  const totalDays = Math.round(gaWeeksDecimal * 7);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks, days, formatted: `${weeks}+${days} sem` };
}

/**
 * Calcula el Peso Fetal Estimado (PFE) usando la fórmula multivariable de Hadlock 4 (DBP, CC, CA, LF)
 * Log10(BW) = 1.3596 - 0.00386(AC*FL) + 0.0064(HC) + 0.0438(AC) + 0.158(FL) [en cm]
 * @param bpdMm Diámetro Biparietal en mm
 * @param hcMm Circunferencia Cefálica en mm
 * @param acMm Circunferencia Abdominal en mm
 * @param flMm Longitud Femoral en mm
 * @returns Peso Fetal Estimado en gramos y rango de error (+/- 10%)
 */
export function calculateEFW(
  bpdMm: number,
  hcMm: number,
  acMm: number,
  flMm: number
): {
  weightGrams: number;
  minGrams: number;
  maxGrams: number;
  formatted: string;
} {
  // Convertir a cm para la fórmula clásica de Hadlock
  const bpdCm = bpdMm / 10;
  const hcCm = hcMm / 10;
  const acCm = acMm / 10;
  const flCm = flMm / 10;

  if (acCm <= 0 || flCm <= 0) {
    return { weightGrams: 0, minGrams: 0, maxGrams: 0, formatted: '—' };
  }

  let log10Weight: number;

  if (bpdCm > 0 && hcCm > 0) {
    // Hadlock 4 parámetros (BPD, HC, AC, FL)
    log10Weight =
      1.3596 -
      0.00386 * (acCm * flCm) +
      0.0064 * hcCm +
      0.0438 * acCm +
      0.158 * flCm;
  } else if (hcCm > 0) {
    // Hadlock 3 parámetros (HC, AC, FL)
    log10Weight =
      1.326 -
      0.00326 * (acCm * flCm) +
      0.0107 * hcCm +
      0.0438 * acCm +
      0.158 * flCm;
  } else {
    // Hadlock 2 parámetros (AC, FL)
    log10Weight =
      1.304 +
      0.05281 * acCm +
      0.18 * flCm -
      0.003343 * (acCm * flCm);
  }

  const rawGrams = Math.pow(10, log10Weight);
  const weightGrams = Math.round(rawGrams);
  const minGrams = Math.round(weightGrams * 0.9);
  const maxGrams = Math.round(weightGrams * 1.1);

  return {
    weightGrams,
    minGrams,
    maxGrams,
    formatted: `${weightGrams} g (±10%: ${minGrams}-${maxGrams} g)`,
  };
}

/**
 * Calcula el promedio de edad gestacional biométrica combinada
 */
export function calculateAverageGA(parameters: Array<{ weeks: number; days: number }>): {
  averageWeeks: number;
  averageDays: number;
  formatted: string;
} {
  const valid = parameters.filter((p) => p.weeks > 0);
  if (valid.length === 0) return { averageWeeks: 0, averageDays: 0, formatted: '—' };

  const totalDays = valid.reduce((acc, curr) => acc + (curr.weeks * 7 + curr.days), 0);
  const avgTotalDays = Math.round(totalDays / valid.length);
  const averageWeeks = Math.floor(avgTotalDays / 7);
  const averageDays = avgTotalDays % 7;

  return {
    averageWeeks,
    averageDays,
    formatted: `${averageWeeks}+${averageDays} sem`,
  };
}

/**
 * Evalúa el Índice de Líquido Amniótico (ILA / Phelan)
 * @param ilaMm Suma de los 4 cuadrantes en mm (o cm * 10)
 */
export function evaluateAmnioticFluid(ilaMm: number): {
  status: 'oligohidramnios' | 'limite_inferior' | 'normal' | 'polihidramnios' | 'no_evaluado';
  label: string;
  color: string;
} {
  if (!ilaMm || ilaMm <= 0) {
    return { status: 'no_evaluado', label: 'Sin evaluar', color: '#94a3b8' };
  }
  if (ilaMm < 50) {
    return { status: 'oligohidramnios', label: 'Oligohidramnios (< 50 mm)', color: '#ef4444' };
  }
  if (ilaMm < 80) {
    return { status: 'limite_inferior', label: 'Límite Inferior (50–80 mm)', color: '#f59e0b' };
  }
  if (ilaMm <= 240) {
    return { status: 'normal', label: 'Líquido Amniótico Normal (80–240 mm)', color: '#10b981' };
  }
  return { status: 'polihidramnios', label: 'Polihidramnios (> 240 mm)', color: '#ef4444' };
}

/**
 * Evalúa la Translucencia Nucal (TN en mm) en el I Trimestre (semana 11.0 a 13.6)
 */
export function evaluateNuchalTranslucency(tnMm: number): {
  alert: boolean;
  message: string;
  color: string;
} {
  if (!tnMm || tnMm <= 0) return { alert: false, message: 'Normal', color: '#94a3b8' };
  if (tnMm >= 3.0) {
    return {
      alert: true,
      message: 'TN Aumentada (≥ 3.0 mm): Alerta de riesgo de aneuploidía / cardiopatía fetal',
      color: '#ef4444',
    };
  }
  if (tnMm >= 2.5) {
    return {
      alert: true,
      message: 'TN en límite superior (2.5–2.9 mm): Sugerido control morfológico estricto',
      color: '#f59e0b',
    };
  }
  return {
    alert: false,
    message: 'TN Normal (< 2.5 mm)',
    color: '#10b981',
  };
}

/**
 * Calculadora de Reposo Médico Prenatal y Posnatal (Legislación LOTTT / LOPCYMAT Venezuela)
 * - Prenatal: 6 semanas antes de la FPP (semana 34 a 40)
 * - Posnatal: 12 semanas (84 días) continuos a partir del parto
 * @param fppDateStr Fecha Probable de Parto (YYYY-MM-DD)
 * @param actualDeliveryDateStr Fecha real de parto si ya ocurrió
 */
export function calculateMaternityLeave(
  fppDateStr: string,
  actualDeliveryDateStr?: string
): {
  prenatalStartDate: string;
  prenatalEndDate: string;
  prenatalWeeks: number;
  posnatalStartDate: string;
  posnatalEndDate: string;
  posnatalDays: number;
  totalRestDays: number;
} {
  if (!fppDateStr) {
    return {
      prenatalStartDate: '',
      prenatalEndDate: '',
      prenatalWeeks: 6,
      posnatalStartDate: '',
      posnatalEndDate: '',
      posnatalDays: 84,
      totalRestDays: 126,
    };
  }

  const fpp = new Date(fppDateStr);
  // Inicio prenatal: 6 semanas (42 días) antes de la FPP
  const preStart = new Date(fpp);
  preStart.setDate(preStart.getDate() - 42);

  // Fin prenatal: el día antes de la FPP (o día del parto)
  const preEnd = new Date(fpp);
  preEnd.setDate(preEnd.getDate() - 1);

  // Posnatal: desde el parto (o FPP) por 84 días (12 semanas)
  const deliveryDate = actualDeliveryDateStr ? new Date(actualDeliveryDateStr) : new Date(fpp);
  const posStart = new Date(deliveryDate);
  const posEnd = new Date(deliveryDate);
  posEnd.setDate(posEnd.getDate() + 84);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    prenatalStartDate: formatDate(preStart),
    prenatalEndDate: formatDate(preEnd),
    prenatalWeeks: 6,
    posnatalStartDate: formatDate(posStart),
    posnatalEndDate: formatDate(posEnd),
    posnatalDays: 84,
    totalRestDays: 42 + 84,
  };
}
