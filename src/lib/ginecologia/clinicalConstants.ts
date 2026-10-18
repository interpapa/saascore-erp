/**
 * Constantes y Catálogos Clínicos Estándar - Ginecología, Obstetricia y Cirugía
 * Sistema Bethesda 2014, Clasificación de Grannum, BI-RADS, Reid, Perfiles y Procedimientos Quirúrgicos
 */

export interface BethesdaCategory {
  code: string;
  label: string;
  severity: 'normal' | 'low_risk' | 'high_risk' | 'malignant';
  description: string;
  recommendation: string;
}

export const BETHESDA_2014_CATEGORIES: BethesdaCategory[] = [
  {
    code: 'NILM',
    label: 'Negativo para Lesión Intraepitelial o Malignidad (NILM)',
    severity: 'normal',
    description: 'Células escamosas y endocervicales dentro de límites normales.',
    recommendation: 'Control citológico de rutina en 1 a 3 años según factores de riesgo.',
  },
  {
    code: 'ASC-US',
    label: 'Atipias de Células Escamosas de Significado Indeterminado (ASC-US)',
    severity: 'low_risk',
    description: 'Alteraciones celulares que exceden los cambios reactivos pero no son diagnósticas de L-SIL.',
    recommendation: 'Tipificación de VPH de alto riesgo o repetir citología en 6 meses.',
  },
  {
    code: 'ASC-H',
    label: 'Atipias de Células Escamosas - No se Descarta Alto Grado (ASC-H)',
    severity: 'high_risk',
    description: 'Células atípicas sugestivas de lesión de alto grado.',
    recommendation: 'Colposcopia inmediata y toma de biopsia dirigida.',
  },
  {
    code: 'L-SIL',
    label: 'Lesión Intraepitelial Escamosa de Bajo Grado (L-SIL / NIC I / VPH)',
    severity: 'low_risk',
    description: 'Cambios citopáticos compatibles con infección por VPH o displasia leve (NIC I).',
    recommendation: 'Colposcopia para descartar lesión oculta de alto grado o seguimiento estrecho.',
  },
  {
    code: 'H-SIL',
    label: 'Lesión Intraepitelial Escamosa de Alto Grado (H-SIL / NIC II / NIC III / CIS)',
    severity: 'high_risk',
    description: 'Cambios compatibles con displasia moderada, severa o carcinoma in situ.',
    recommendation: 'Colposcopia inmediata con biopsia y conización diagnóstica/terapéutica (LEEP / Asa diatérmica).',
  },
  {
    code: 'CARCINOMA',
    label: 'Carcinoma de Células Escamosas Invasor',
    severity: 'malignant',
    description: 'Células malignas escamosas con necrosis o diátesis tumoral.',
    recommendation: 'Referencia urgente a Ginecología Oncológica para estadiaje y tratamiento.',
  },
  {
    code: 'AGC',
    label: 'Células Glandulares Atípicas (AGC - Endocervicales o Endometriales)',
    severity: 'high_risk',
    description: 'Atipia glandular que puede asociarse a adenocarcinoma o patología endometrial.',
    recommendation: 'Colposcopia, legrado endocervical y biopsia de endometrio si la paciente es ≥ 35 años o sangrado anormal.',
  },
];

export const VAGINAL_MICROORGANISMS = [
  'Lactobacillus sp. (Flora bacilar fisiológica normal)',
  'Gardnerella vaginalis (Células clave / Vaginosis bacteriana)',
  'Candida sp. (Esporas e hifas / Candidiasis)',
  'Trichomonas vaginalis (Tricomoniasis activa)',
  'Flora cocoide y bacilar mixta',
  'Actinomyces sp. (Frecuente en usuarias de DIU)',
  'Efecto citopático por Virus Herpes Simple (VHS)',
];

export const GRANNUM_PLACENTA_GRADES = [
  { grade: '0', label: 'Grado 0 (Placa corial lisa, ecogénica homogénea, sin calcificaciones)' },
  { grade: 'I', label: 'Grado I (Ondulaciones sutiles en placa corial, calcificaciones puntiformes dispersas)' },
  { grade: 'II', label: 'Grado II (Indentaciones coriales marcadas sin llegar a la basal, calcificaciones en comas)' },
  { grade: 'III', label: 'Grado III/III (Indentaciones que alcanzan la placa basal dividiendo en cotiledones, centros anecoicos)' },
];

export const BIRADS_CATEGORIES = [
  { code: '0', label: 'BI-RADS 0: Evaluación incompleta, requiere estudios adicionales (Eco / Conos / Magnificación)' },
  { code: '1', label: 'BI-RADS 1: Negativo / Normal (0% probabilidad de malignidad)' },
  { code: '2', label: 'BI-RADS 2: Hallazgo Benigno (Quiste simple, fibroadenoma estable, calcificaciones vasculares) (0%)' },
  { code: '3', label: 'BI-RADS 3: Probablemente Benigno (< 2% riesgo) - Control a corto plazo en 6 meses' },
  { code: '4A', label: 'BI-RADS 4A: Baja sospecha de malignidad (2% a 10%) - Biopsia sugerida' },
  { code: '4B', label: 'BI-RADS 4B: Sospecha moderada de malignidad (10% a 50%) - Biopsia indicada' },
  { code: '4C', label: 'BI-RADS 4C: Alta sospecha de malignidad (50% a 95%) - Biopsia obligatoria' },
  { code: '5', label: 'BI-RADS 5: Altamente sugestivo de malignidad (> 95%) - Biopsia y conducta oncológica' },
  { code: '6', label: 'BI-RADS 6: Malignidad confirmada por biopsia previa' },
];

export interface SurgicalProcedureConfig {
  id: string;
  name: string;
  defaultPriceUSD: number;
  surgeonSplitPercent: number;
  assistantSplitPercent: number;
  anesthesiologistSplitPercent: number;
  pediatricianRequired: boolean;
  notes: string;
}

export const GINECO_SURGICAL_CATALOG: SurgicalProcedureConfig[] = [
  {
    id: 'surg_cesarea',
    name: 'Cesárea Segmentaria + Salpingectomía / Esterilización',
    defaultPriceUSD: 850,
    surgeonSplitPercent: 50,
    assistantSplitPercent: 15,
    anesthesiologistSplitPercent: 20,
    pediatricianRequired: true,
    notes: 'Incluye recepción y reanimación del recién nacido por neonatólogo/pediatra.',
  },
  {
    id: 'surg_parto_distocico',
    name: 'Atención de Parto Vaginal / Instrumentado con Episiotomía y Episiorrafia',
    defaultPriceUSD: 600,
    surgeonSplitPercent: 55,
    assistantSplitPercent: 15,
    anesthesiologistSplitPercent: 15,
    pediatricianRequired: true,
    notes: 'Incluye atención obstétrica, alumbramiento y atención neonatal inmediata.',
  },
  {
    id: 'surg_histerectomia_abd',
    name: 'Histerectomía Total Abdominal con o sin Salpingooforectomía',
    defaultPriceUSD: 1200,
    surgeonSplitPercent: 55,
    assistantSplitPercent: 20,
    anesthesiologistSplitPercent: 25,
    pediatricianRequired: false,
    notes: 'Cirugía mayor ginecológica para miomatosis uterina, adenomiosis o prolapso.',
  },
  {
    id: 'surg_laparoscopia_diag',
    name: 'Laparoscopia Ginecológica Diagnóstica / Operatorio de Quiste Ovárico',
    defaultPriceUSD: 950,
    surgeonSplitPercent: 55,
    assistantSplitPercent: 20,
    anesthesiologistSplitPercent: 25,
    pediatricianRequired: false,
    notes: 'Mínimamente invasiva para quistectomía, endometriosis o dolor pélvico crónico.',
  },
  {
    id: 'surg_legrado_ameu',
    name: 'Aspiración Manual Endouterina (AMEU) / Legrado Uterino Instrumental',
    defaultPriceUSD: 350,
    surgeonSplitPercent: 60,
    assistantSplitPercent: 15,
    anesthesiologistSplitPercent: 25,
    pediatricianRequired: false,
    notes: 'Resolución de aborto incompleto, huevo anembrionado o biopsia diagnóstica de endometrio.',
  },
  {
    id: 'surg_colpoplastia',
    name: 'Colpoplastia Anterior y Posterior (Cura Quirúrgica de Prolapso Genital)',
    defaultPriceUSD: 750,
    surgeonSplitPercent: 55,
    assistantSplitPercent: 20,
    anesthesiologistSplitPercent: 25,
    pediatricianRequired: false,
    notes: 'Reparación del suelo pélvico para cistocele y rectocele sintomáticos.',
  },
  {
    id: 'surg_leep_conizacion',
    name: 'Conización Cervical con Asa Diatérmica (LEEP / LLETZ)',
    defaultPriceUSD: 280,
    surgeonSplitPercent: 70,
    assistantSplitPercent: 0,
    anesthesiologistSplitPercent: 30,
    pediatricianRequired: false,
    notes: 'Tratamiento escisional de lesiones intraepiteliales de alto grado (H-SIL / NIC II-III).',
  },
];

export const LAB_ORDER_PROFILES = [
  {
    id: 'prof_obs_i',
    title: 'Perfil Obstétrico I Trimestre',
    orders: [
      'Hematología Completa y Plaquetas',
      'Glicemia en Ayunas',
      'Urea y Creatinina',
      'Grupo Sanguíneo y Factor Rh',
      'VDRL / RPR (Serología Sífilis)',
      'VIH Anticuerpos (ELISA 4ta Gen / Rápida)',
      'Toxoplasmosis IgG e IgM',
      'HBsAg (Antígeno de Superficie Hepatitis B)',
      'HCV Anticuerpos (Hepatitis C)',
      'Examen General de Orina y Urocultivo',
      'TSH y T4 Libre',
    ],
  },
  {
    id: 'prof_obs_ii_iii',
    title: 'Perfil Obstétrico II y III Trimestre (Control)',
    orders: [
      'Hematología Completa y Plaquetas',
      'Curva de Tolerancia a la Glucosa (CTG 75g a las 24-28 sem)',
      'Urea, Creatinina y Ácido Úrico (Cribado Preeclampsia)',
      'VDRL (Repetición III Trimestre)',
      'VIH (Repetición preparto)',
      'Toxoplasmosis IgM (en pacientes seronegativas para IgG)',
      'Tiempos de Coagulación (TP, TPT, Fibrinógeno)',
      'Examen de Orina con descarte de Proteinuria',
      'Cultivo Rectovaginal para Estreptococo del Grupo B (Semana 35-37)',
    ],
  },
  {
    id: 'prof_preop',
    title: 'Perfil Pre-Operatorio Quirúrgico Ginecológico',
    orders: [
      'Hematología Completa y Recuento de Plaquetas',
      'Tiempos de Coagulación (TP con INR, TPT)',
      'Glicemia, Urea y Creatinina',
      'Grupo Sanguíneo y Factor Rh',
      'Electrocardiograma (ECG) y Evaluación Cardiovascular preoperatoria',
      'Radiografía de Tórax PA',
      'VIH y VDRL',
    ],
  },
  {
    id: 'prof_infertilidad',
    title: 'Perfil de Infertilidad Femenina / Endocrinología Reproductiva',
    orders: [
      'FSH (Hormona Foliculoestimulante - Día 3 del ciclo)',
      'LH (Hormona Luteinizante - Día 3 del ciclo)',
      'Estradiol (E2 - Día 3 del ciclo)',
      'Prolactina basal',
      'TSH y T4 Libre',
      'Hormona Antimülleriana (AMH - Reserva ovárica)',
      'Progesterona en Fase Lútea (Día 21 o 7 días post-ovulación)',
      'Testosterona Total y Libre, DHEA-SO4, 17-OH Progesterona (descarte SOP / hiperandrogenismo)',
      'Histerosalpingografía (HSG - Permeabilidad tubárica)',
    ],
  },
];
