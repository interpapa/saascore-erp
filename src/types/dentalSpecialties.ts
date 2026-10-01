/**
 * Tipos y Modelos de Especialidades Odontológicas Avanzadas
 * Ortodoncia (Brackets & Alineadores), Endodoncia y Periodoncia
 */

export type OrthoTechnique = 
  | 'metal_roth'
  | 'metal_mbt'
  | 'esthetic_sapphire'
  | 'ceramic'
  | 'self_ligating_damon'
  | 'lingual'
  | 'clear_aligners';

export type WireMaterial = 
  | 'niti_thermal'
  | 'niti_superelastic'
  | 'stainless_steel'
  | 'tma_beta_ti'
  | 'none';

export type WireSize = 
  | '.012'
  | '.014'
  | '.016'
  | '.018'
  | '.020'
  | '.016x.016'
  | '.016x.022'
  | '.017x.025'
  | '.019x.025';

export type LigatureType = 
  | 'elastic_individual'
  | 'metal_individual'
  | 'kobayashi'
  | 'power_chain_closed'
  | 'power_chain_open';

export interface OrthoArchState {
  wireMaterial: WireMaterial;
  wireSize: WireSize;
  ligatureType: LigatureType;
  colorName: string;
  colorHex: string;
}

export interface OrthoElastics {
  vector: 'none' | 'class_II' | 'class_III' | 'box_anterior' | 'triangular' | 'midline';
  force: 'light_2.5oz' | 'medium_4.5oz' | 'heavy_6oz';
  size: '1/8"' | '3/16"' | '1/4"' | '5/16"';
}

export interface OrthoIncidents {
  droppedBrackets: string[]; // Números FDI, ej ['12', '24']
  chargeDroppedBrackets: boolean;
  droppedBracketCostUSD: number;
  debondedTubes: string[];
  distalWireCutDone: boolean;
}

export interface OrthodonticVisit {
  id: string;
  date: string;
  sessionNumber: number;
  performer: string;
  doctorId?: string;
  doctorName?: string;
  doctorCommissionPercent?: number;
  archUpper: OrthoArchState;
  archLower: OrthoArchState;
  elastics: OrthoElastics;
  incidents: OrthoIncidents;
  hygiene: 'excellent' | 'good' | 'poor_warning';
  notes: string;
  chargeSentToCashier: boolean;
  amountChargedUSD: number;
}

export interface OrthodonticCase {
  patientId: string;
  technique: OrthoTechnique;
  slotSize: '.018' | '.022';
  angleClassification: 'class_I' | 'class_II_div_1' | 'class_II_div_2' | 'class_III';
  crowding: 'none' | 'mild' | 'moderate' | 'severe';
  crossbite: 'none' | 'anterior' | 'posterior_unilateral' | 'posterior_bilateral';
  openBite: boolean;
  deepBite: boolean;
  plannedExtractions: string[]; // Números FDI
  startDate: string;
  estimatedMonths: number;
  monthlyFeeUSD: number;
  bracketReplacementFeeUSD: number;
  doctorId?: string;
  doctorName?: string;
  doctorCommissionPercent?: number;
  status: 'active' | 'retention' | 'finished' | 'suspended';
  retentionType?: 'hawley' | 'essix_clear' | 'fixed_lingual_wire';
  visits: OrthodonticVisit[];
}

export interface EndodonticCanal {
  id: string;
  name: string; // ej. MV1, MV2, DV, P
  referenceCusp: string;
  workLengthMM: number; // LT
  mafSize: string; // ej. #30 .04
  coneSize: string;
  sealerCement: string;
}

export interface EndodonticRecord {
  id: string;
  toothNumber: string;
  date: string;
  diagnosisPulpar: 'pulpitis_reversible' | 'pulpitis_irreversible' | 'necrosis' | 'previo_iniciado';
  diagnosisPeriapical: 'normal' | 'periodontitis_apical' | 'absceso_agudo' | 'absceso_cronico';
  instrumentation: 'rotary' | 'reciprocating' | 'manual';
  irrigant: 'NaOCl_2.5' | 'NaOCl_5.25' | 'Chlorhexidine_2' | 'EDTA_17';
  canals: EndodonticCanal[];
  completed: boolean;
  notes: string;
}

export interface PeriodonticRecord {
  id: string;
  date: string;
  bleedingOnProbingPercent: number; // BOP %
  deepPocketsCount: number; // Bolsas >= 4mm
  plaqueIndexPercent: number;
  severeMobilityTeeth: Array<{ tooth: string; degree: 'I' | 'II' | 'III' }>;
  furcationInvolvement: string[]; // Dientes con lesión de furca
  notes: string;
}
