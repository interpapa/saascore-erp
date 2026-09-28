/**
 * Rendo ERP / SaaSCore - Catálogo Maestro de Procedimientos Odontológicos y Aranceles
 *
 * Proporciona la biblioteca de tratamientos clínicos estándar con precios de referencia en USD,
 * categorías especializadas, sesiones estimadas y desglose de etapas/capas del proceso.
 * Se fusiona automáticamente con los servicios creados en el catálogo de la empresa.
 */

export interface DentalClinicalStage {
  id: string;
  title: string;
  order: number;
  sessionNumber?: number;
  description?: string;
}

export interface DentalProcedureDefinition {
  id: string;
  code: string;
  name: string;
  category: 'preventiva' | 'restauradora' | 'endodoncia' | 'cirugia' | 'protesis' | 'ortodoncia' | 'estetica' | 'periodoncia';
  categoryLabel: string;
  defaultPriceUSD: number;
  estimatedDurationMin: number;
  sessionsRequired: number; // 1 = cita única, >1 = multisesión
  applicableTo: 'tooth' | 'arch' | 'mouth';
  stages: DentalClinicalStage[];
  color: string;
  conditionCode?: string; // vinculación con simbología FDI del odontograma
}

export const DENTAL_PROCEDURES_MASTER: DentalProcedureDefinition[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. PREVENCIÓN & HIGIENE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-prev-01',
    code: 'PRO-01',
    name: 'Profilaxis Dental & Limpieza Ultrasonido',
    category: 'preventiva',
    categoryLabel: 'Prevención & Higiene',
    defaultPriceUSD: 30.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    applicableTo: 'mouth',
    color: '#06b6d4',
    stages: [
      { id: 'stg-1', title: 'Destartraje supragingival con ultrasonido', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Pulido dental con pasta profiláctica y flúor tópico', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-prev-02',
    code: 'PRO-02',
    name: 'Sellantes de Fosas y Fisuras (por pieza)',
    category: 'preventiva',
    categoryLabel: 'Prevención & Higiene',
    defaultPriceUSD: 15.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    applicableTo: 'tooth',
    color: '#0ea5e9',
    stages: [
      { id: 'stg-1', title: 'Aislamiento y grabado ácido', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Aplicación y fotopolimerizado de sellante', order: 2, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. OPERATORIA & RESTAURACIÓN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-rest-01',
    code: 'RES-01',
    name: 'Restauración con Resina Fotocurada (1 Cara)',
    category: 'restauradora',
    categoryLabel: 'Operatoria & Resinas',
    defaultPriceUSD: 35.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    applicableTo: 'tooth',
    color: '#3b82f6',
    conditionCode: 'obturacion',
    stages: [
      { id: 'stg-1', title: 'Eliminación de tejido cariado y preparación cavitaria', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Acondicionamiento adhesivo y estratificación de resina', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Ajuste oclusal y pulido de alto brillo', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-rest-02',
    code: 'RES-02',
    name: 'Restauración Compleja con Resina (2 o más Caras)',
    category: 'restauradora',
    categoryLabel: 'Operatoria & Resinas',
    defaultPriceUSD: 50.0,
    estimatedDurationMin: 50,
    sessionsRequired: 1,
    applicableTo: 'tooth',
    color: '#2563eb',
    conditionCode: 'obturacion',
    stages: [
      { id: 'stg-1', title: 'Aislamiento absoluto con dique de goma', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Reconstrucción proximal con matriz seccional y resina', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Tallado de anatomía oclusal, control de contacto y pulido', order: 3, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. ENDODONCIA (TRATAMIENTO DE CONDUCTO)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-endo-01',
    code: 'END-01',
    name: 'Endodoncia Unirradicular (Incisivos / Caninos)',
    category: 'endodoncia',
    categoryLabel: 'Endodoncia',
    defaultPriceUSD: 80.0,
    estimatedDurationMin: 60,
    sessionsRequired: 2,
    applicableTo: 'tooth',
    color: '#8b5cf6',
    conditionCode: 'endodoncia',
    stages: [
      { id: 'stg-1', title: 'Apertura cameral y extirpación pulpar (Cita 1)', order: 1, sessionNumber: 1, description: 'Desinfección y medicación intraconducto' },
      { id: 'stg-2', title: 'Instrumentación rotatoria y conductometría radiográfica (Cita 1)', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Obturación definitiva con gutapercha y sellador (Cita 2)', order: 3, sessionNumber: 2, description: 'Sellado hermético y radiografía final' },
    ],
  },
  {
    id: 'proc-endo-02',
    code: 'END-02',
    name: 'Endodoncia Multirradicular (Premolares / Molares)',
    category: 'endodoncia',
    categoryLabel: 'Endodoncia',
    defaultPriceUSD: 140.0,
    estimatedDurationMin: 75,
    sessionsRequired: 2,
    applicableTo: 'tooth',
    color: '#7c3aed',
    conditionCode: 'endodoncia',
    stages: [
      { id: 'stg-1', title: 'Apertura cameral, localización de 3-4 conductos y desinfección (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Conformación biomecánica e irrigación ultrasónica (Cita 1)', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Obturación termoplástica de conductos y radiografía de control (Cita 2)', order: 3, sessionNumber: 2 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. CIRUGÍA ORAL & EXODONCIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-cir-01',
    code: 'CIR-01',
    name: 'Extracción Simple (Exodoncia)',
    category: 'cirugia',
    categoryLabel: 'Cirugía Oral',
    defaultPriceUSD: 40.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    applicableTo: 'tooth',
    color: '#e11d48',
    conditionCode: 'ausente',
    stages: [
      { id: 'stg-1', title: 'Anestesia infiltrativa o troncular y sindesmotomía', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Luxación y avulsión de la pieza dental', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Curetaje alveolar, hemostasia e indicaciones post-operatorias', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-cir-02',
    code: 'CIR-02',
    name: 'Cirugía de Tercer Molar / Cordal Incluida',
    category: 'cirugia',
    categoryLabel: 'Cirugía Oral',
    defaultPriceUSD: 110.0,
    estimatedDurationMin: 60,
    sessionsRequired: 2,
    applicableTo: 'tooth',
    color: '#be123c',
    conditionCode: 'ausente',
    stages: [
      { id: 'stg-1', title: 'Incisión, osteotomía y odontosección quirúrgica (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Extracción de la pieza y sutura con hilo reabsorbible (Cita 1)', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Control post-quirúrgico y retiro de puntos a los 7 días (Cita 2)', order: 3, sessionNumber: 2 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. PRÓTESIS & REHABILITACIÓN ORAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-prot-01',
    code: 'PROT-01',
    name: 'Corona de Porcelana sobre Metal o Zirconio',
    category: 'protesis',
    categoryLabel: 'Prótesis & Rehabilitación',
    defaultPriceUSD: 180.0,
    estimatedDurationMin: 60,
    sessionsRequired: 3,
    applicableTo: 'tooth',
    color: '#f59e0b',
    conditionCode: 'corona',
    stages: [
      { id: 'stg-1', title: 'Tallado protésico, toma de impresión y provisorio acrílico (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Envío y confección en laboratorio dental (Inter-sesión)', order: 2, sessionNumber: 2, description: 'Espera de laboratorio' },
      { id: 'stg-3', title: 'Prueba de estructura, ajuste estético y oclusal (Cita 2)', order: 3, sessionNumber: 2 },
      { id: 'stg-4', title: 'Cementación definitiva adhesiva y pulido final (Cita 3)', order: 4, sessionNumber: 3 },
    ],
  },
  {
    id: 'proc-prot-02',
    code: 'PROT-02',
    name: 'Perno de Fibra de Vidrio + Reconstrucción de Muñón',
    category: 'protesis',
    categoryLabel: 'Prótesis & Rehabilitación',
    defaultPriceUSD: 60.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    applicableTo: 'tooth',
    color: '#d97706',
    stages: [
      { id: 'stg-1', title: 'Desobturación parcial de conducto y calibrado', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Cementación de poste de fibra y muñón con composite estructural', order: 2, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. IMPLANTOLOGÍA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-imp-01',
    code: 'IMP-01',
    name: 'Implante Dental de Titanio Grado Quirúrgico',
    category: 'cirugia',
    categoryLabel: 'Implantología',
    defaultPriceUSD: 350.0,
    estimatedDurationMin: 75,
    sessionsRequired: 3,
    applicableTo: 'tooth',
    color: '#6366f1',
    conditionCode: 'implante',
    stages: [
      { id: 'stg-1', title: 'Fase Quirúrgica: Colocación del implante intraóseo y sutura (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Período de osteointegración (Espera biológica 2-3 meses)', order: 2, sessionNumber: 2 },
      { id: 'stg-3', title: 'Fase de Conexión: Pilar de cicatrización y toma de impresión (Cita 2)', order: 3, sessionNumber: 2 },
      { id: 'stg-4', title: 'Fase Protésica: Instalación de corona atornillada sobre implante (Cita 3)', order: 4, sessionNumber: 3 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. ESTÉTICA DENTAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-est-01',
    code: 'EST-01',
    name: 'Blanqueamiento Dental LED en Consultorio',
    category: 'estetica',
    categoryLabel: 'Estética Dental',
    defaultPriceUSD: 90.0,
    estimatedDurationMin: 60,
    sessionsRequired: 1,
    applicableTo: 'mouth',
    color: '#10b981',
    stages: [
      { id: 'stg-1', title: 'Aislamiento gingival con barrera fotopolimerizable', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Aplicación de peróxido al 35% y activación por luz LED (3 ciclos)', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Lavado, remineralizante desensibilizante y registro de tono final', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-est-02',
    code: 'EST-02',
    name: 'Carilla Estética de Porcelana / Cerámica',
    category: 'estetica',
    categoryLabel: 'Estética Dental',
    defaultPriceUSD: 160.0,
    estimatedDurationMin: 60,
    sessionsRequired: 2,
    applicableTo: 'tooth',
    color: '#059669',
    stages: [
      { id: 'stg-1', title: 'Preparación vestibular mínima y toma de impresión digital (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Prueba de color, grabado con ácido fluorhídrico y cementación (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. ORTODONCIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-orto-01',
    code: 'ORT-01',
    name: 'Control Mensual de Ortodoncia / Ajuste de Brackets',
    category: 'ortodoncia',
    categoryLabel: 'Ortodoncia',
    defaultPriceUSD: 30.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    applicableTo: 'mouth',
    color: '#ec4899',
    stages: [
      { id: 'stg-1', title: 'Revisión biomecánica, cambio de ligaduras o arcos Niti', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Control de higiene y planificación de próxima activación', order: 2, sessionNumber: 1 },
    ],
  },
];

/**
 * Combina el catálogo maestro de odontología con los servicios específicos registrados
 * en el inventario/catálogo del tenant para ofrecer precios personalizados sin perder cobertura.
 */
export function mergeTenantDentalServices(
  tenantItems: Array<{ id: string; name: string; base_price?: number; type?: string; metadata?: any }>
): DentalProcedureDefinition[] {
  const customProcedures: DentalProcedureDefinition[] = [];

  // 1. Identificar servicios clínicos creados por la empresa
  for (const item of tenantItems || []) {
    if (item.type === 'service') {
      const existingMatch = DENTAL_PROCEDURES_MASTER.find(
        p => p.name.toLowerCase() === item.name.toLowerCase()
      );

      if (existingMatch) {
        // Sobrescribir precio con el precio configurado por la empresa
        customProcedures.push({
          ...existingMatch,
          id: item.id,
          defaultPriceUSD: Number(item.base_price || existingMatch.defaultPriceUSD),
        });
      } else {
        // Nuevo servicio no contemplado en el catálogo base
        customProcedures.push({
          id: item.id,
          code: `SERV-${item.id.slice(0, 4).toUpperCase()}`,
          name: item.name,
          category: 'restauradora',
          categoryLabel: 'Servicio Clínico',
          defaultPriceUSD: Number(item.base_price || 40),
          estimatedDurationMin: Number(item.metadata?.duration_minutes || 45),
          sessionsRequired: 1,
          applicableTo: 'tooth',
          color: '#0d9488',
          stages: [
            { id: `stg-custom-1`, title: `Ejecución de ${item.name}`, order: 1, sessionNumber: 1 }
          ]
        });
      }
    }
  }

  // 2. Agregar los procedimientos maestros que la empresa no haya creado aún
  for (const master of DENTAL_PROCEDURES_MASTER) {
    const alreadyIncluded = customProcedures.some(p => p.name.toLowerCase() === master.name.toLowerCase());
    if (!alreadyIncluded) {
      customProcedures.push(master);
    }
  }

  return customProcedures;
}
