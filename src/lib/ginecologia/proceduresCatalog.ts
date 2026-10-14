/**
 * Rendo ERP / SaaSCore - Catálogo Maestro de Procedimientos Ginecológicos y Obstétricos
 *
 * Biblioteca de procedimientos clínicos y quirúrgicos con precios base de referencia en USD,
 * categorías especializadas, sesiones estimadas y desglose de etapas del proceso.
 * Se fusiona automáticamente con los servicios y tarifas configuradas por la empresa.
 */

export interface GinecoClinicalStage {
  id: string;
  title: string;
  order: number;
  sessionNumber?: number;
  description?: string;
}

export interface GinecoProcedureDefinition {
  id: string;
  code: string;
  name: string;
  category: 'consulta' | 'diagnostico' | 'procedimientos' | 'obstetricia' | 'anticoncepcion';
  categoryLabel: string;
  defaultPriceUSD: number;
  estimatedDurationMin: number;
  sessionsRequired: number; // 1 = cita única, >1 = control multisesión
  stages: GinecoClinicalStage[];
  color: string;
}

export const GINECO_PROCEDURES_MASTER: GinecoProcedureDefinition[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. CONSULTAS & EVALUACIÓN INTEGRAL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-gin-01',
    code: 'GIN-01',
    name: 'Consulta Ginecológica Integral',
    category: 'consulta',
    categoryLabel: 'Consultas & Chequeo',
    defaultPriceUSD: 50.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    color: '#ec4899', // pink-500
    stages: [
      { id: 'stg-1', title: 'Anamnesis ginecológica y antecedentes reproductivos', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Examen de mamas y exploración pélvica bimanual', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Evolución clínica, diagnóstico y prescripción médica', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-02',
    code: 'GIN-02',
    name: 'Control Prenatal + Doppler Fetal',
    category: 'obstetricia',
    categoryLabel: 'Obstetricia & Embarazo',
    defaultPriceUSD: 60.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    color: '#f43f5e', // rose-500
    stages: [
      { id: 'stg-1', title: 'Medición de AU, peso materno y presión arterial', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Auscultación de Frecuencia Cardíaca Fetal (Doppler)', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Revisión de paraclínicos y órdenes de tamizaje', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-03',
    code: 'GIN-03',
    name: 'Consulta de Planificación Familiar',
    category: 'anticoncepcion',
    categoryLabel: 'Planificación Familiar',
    defaultPriceUSD: 40.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#a855f7', // purple-500
    stages: [
      { id: 'stg-1', title: 'Evaluación de criterios médicos de elegibilidad OMS', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Consejería anticonceptiva y elección informada', order: 2, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. DIAGNÓSTICO CERVICAL & CITOLOGÍA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-gin-04',
    code: 'GIN-04',
    name: 'Citología Cervical PAP (Papanicolaou)',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico & Patología Cervical',
    defaultPriceUSD: 35.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#06b6d4', // cyan-500
    stages: [
      { id: 'stg-1', title: 'Colocación de espéculo vaginal estéril', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Toma exocervical con espátula de Ayre y endocervical con cepillo', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Fijación con alcohol y rotulado para citopatología Bethesda', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-05',
    code: 'GIN-05',
    name: 'Colposcopia Diagnóstica + Test de Schiller',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico & Patología Cervical',
    defaultPriceUSD: 70.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#0284c7', // sky-600
    stages: [
      { id: 'stg-1', title: 'Visualización directa con colposcopio a 10x-16x', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Aplicación de ácido acético al 3-5% (evaluación de epitelio acetoblanco)', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Test de Schiller con solución de Lugol (zonas yodonegativas)', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-06',
    code: 'GIN-06',
    name: 'Colposcopia + Biopsia Dirigida de Cérvix',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico & Patología Cervical',
    defaultPriceUSD: 110.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    color: '#4f46e5', // indigo-600
    stages: [
      { id: 'stg-1', title: 'Localización colposcópica de zona de mayor sospecha', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Anestesia local tópica y toma de muestra con pinza Tischler', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Hemostasia con solución de Monsel y fijación en formol al 10%', order: 3, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. ECOGRAFÍA GINECOLÓGICA & OBSTÉTRICA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-gin-07',
    code: 'GIN-07',
    name: 'Ecografía Pélvica / Transvaginal',
    category: 'diagnostico',
    categoryLabel: 'Ecografía Especializada',
    defaultPriceUSD: 60.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#10b981', // emerald-500
    stages: [
      { id: 'stg-1', title: 'Evaluación de miometrio, grosor de endometrio y anejos ováricos', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Doppler color ovárico y fondo de saco de Douglas', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Emisión de reporte sonográfico con medidas volumétricas', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-08',
    code: 'GIN-08',
    name: 'Ecografía Obstétrica I Trimestre + Marcadores',
    category: 'obstetricia',
    categoryLabel: 'Obstetricia & Embarazo',
    defaultPriceUSD: 65.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#14b8a6', // teal-500
    stages: [
      { id: 'stg-1', title: 'Medición de LCR (Longitud Céfalo-Rabadilla)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Translucencia nucal y presencia de hueso nasal', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Verificación de vitalidad y FCF', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-09',
    code: 'GIN-09',
    name: 'Ecografía Morfológica II Trimestre (Sem 20-24)',
    category: 'obstetricia',
    categoryLabel: 'Obstetricia & Embarazo',
    defaultPriceUSD: 85.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    color: '#0d9488', // teal-600
    stages: [
      { id: 'stg-1', title: 'Biometría fetal completa (DBP, CC, CA, LF)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Screening neurosonográfico fetal y 4 cámaras cardíacas', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Evaluación de líquido amniótico, cordón umbilical y placenta', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-10',
    code: 'GIN-10',
    name: 'Perfil Biofísico Fetal + Doppler Feto-Placentario',
    category: 'obstetricia',
    categoryLabel: 'Obstetricia & Embarazo',
    defaultPriceUSD: 80.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    color: '#0891b2', // cyan-600
    stages: [
      { id: 'stg-1', title: 'Puntuación de Manning (movimientos, tono, respiración y ILA)', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Doppler de arteria umbilical y cerebral media (ACM)', order: 2, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. PROCEDIMIENTOS & DISPOSITIVOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'proc-gin-11',
    code: 'GIN-11',
    name: 'Colocación de Dispositivo Intrauterino (DIU)',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 120.0,
    estimatedDurationMin: 35,
    sessionsRequired: 2,
    color: '#e11d48', // rose-600
    stages: [
      { id: 'stg-1', title: 'Histerometría y colocación aséptica del DIU en cavidad', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Corte de guías a 2-3 cm y verificación de hemostasia', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Control ecográfico post-inserción al mes', order: 3, sessionNumber: 2 },
    ],
  },
  {
    id: 'proc-gin-12',
    code: 'GIN-12',
    name: 'Retiro de Dispositivo Intrauterino (DIU)',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 40.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    color: '#f43f5e',
    stages: [
      { id: 'stg-1', title: 'Visualización de guías endocervicales con espéculo', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Tracción continua con pinza de anillos y verificación de integridad', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-13',
    code: 'GIN-13',
    name: 'Colocación de Implante Subdérmico',
    category: 'anticoncepcion',
    categoryLabel: 'Planificación Familiar',
    defaultPriceUSD: 140.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#9333ea', // purple-600
    stages: [
      { id: 'stg-1', title: 'Infiltración subcutánea de Lidocaína en cara interna del brazo', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Inserción del aplicador precargado y liberación del implante', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Palpación de la varilla subdérmica y vendaje compresivo', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-14',
    code: 'GIN-14',
    name: 'Retiro de Implante Subdérmico',
    category: 'anticoncepcion',
    categoryLabel: 'Planificación Familiar',
    defaultPriceUSD: 50.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#7e22ce',
    stages: [
      { id: 'stg-1', title: 'Palpación de extremos y anestesia local subdérmica', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Microincisión de 2mm y extracción de la varilla con pinza mosquito', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Cierre con steri-strip y vendaje estéril', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-15',
    code: 'GIN-15',
    name: 'Cauterización / Crioterapia Cervical',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 95.0,
    estimatedDurationMin: 35,
    sessionsRequired: 2,
    color: '#ea580c', // orange-600
    stages: [
      { id: 'stg-1', title: 'Tratamiento destructivo de ectopia / eversión glandular', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Indicaciones post-tratamiento y cicatrizantes tópicos', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Control citológico de reepitelización a las 6 semanas', order: 3, sessionNumber: 2 },
    ],
  },
  {
    id: 'proc-gin-16',
    code: 'GIN-16',
    name: 'Polipectomía Endocervical en Consultorio',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 80.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#db2777', // pink-600
    stages: [
      { id: 'stg-1', title: 'Exposición del pedículo del pólipo endocervical', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Torsión / electrofulguración de la base y hemostasia', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Envío de pieza en formol para estudio histopatológico', order: 3, sessionNumber: 1 },
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATÁLOGO DE CIE-10 GINECO-OBSTÉTRICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const GINECO_CIE10_CATALOG: Array<{ code: string; description: string; category: string }> = [
  { code: 'Z34.0', description: 'Supervisión de primer embarazo normal', category: 'Obstetricia' },
  { code: 'Z34.8', description: 'Supervisión de otros embarazos normales (Multípara)', category: 'Obstetricia' },
  { code: 'Z35.9', description: 'Supervisión de embarazo de alto riesgo, no especificado', category: 'Obstetricia' },
  { code: 'O14.0', description: 'Preeclampsia leve o moderada', category: 'Obstetricia' },
  { code: 'O24.4', description: 'Diabetes mellitus que se origina con el embarazo (Gestacional)', category: 'Obstetricia' },
  { code: 'O26.8', description: 'Otras complicaciones especificadas relacionadas con el embarazo', category: 'Obstetricia' },
  { code: 'O20.0', description: 'Amenaza de aborto', category: 'Obstetricia' },
  { code: 'N76.0', description: 'Vaginitis aguda (Candidiasis / Vaginosis bacteriana)', category: 'Ginecología' },
  { code: 'N92.0', description: 'Menstruación excesiva y frecuente con ciclo regular (Menorragia)', category: 'Ginecología' },
  { code: 'N94.6', description: 'Dismenorrea no especificada (Dolor menstrual pélvico)', category: 'Ginecología' },
  { code: 'N87.1', description: 'Displasia cervical moderada (CIN II / Lesión escamosa LSIL)', category: 'Ginecología' },
  { code: 'N87.2', description: 'Displasia cervical severa (CIN III / HSIL)', category: 'Ginecología' },
  { code: 'N80.0', description: 'Endometriosis del útero (Adenomiosis)', category: 'Ginecología' },
  { code: 'D25.0', description: 'Leiomioma submucoso del útero', category: 'Ginecología' },
  { code: 'N97.0', description: 'Infertilidad femenina asociada con anovulación (SOPQ)', category: 'Ginecología' },
  { code: 'N95.1', description: 'Estados menopáusicos y climatéricos femeninos', category: 'Ginecología' },
  { code: 'Z30.0', description: 'Consejo y asesoramiento general sobre la anticoncepción', category: 'Planificación' },
  { code: 'Z30.1', description: 'Inserción de dispositivo anticonceptivo (intrauterino)', category: 'Planificación' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLANTILLAS RÁPIDAS DE RÉCIPE GINECO-OBSTÉTRICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface GinecoPrescriptionTemplate {
  id: string;
  title: string;
  medications: string;
  instructions: string;
  labOrders?: string[];
}

export const GINECO_PRESCRIPTION_TEMPLATES: GinecoPrescriptionTemplate[] = [
  {
    id: 'temp-prenatal',
    title: 'Suplementación Prenatal Básica',
    medications: 
`1. Ácido Fólico 5 mg tabletas: 1 tableta diaria vía oral en ayunas.
2. Sulfato Ferroso 300 mg + Vitamina C: 1 tableta diaria con jugo cítrico (lejos de lácteos).
3. Carbonato de Calcio 600 mg + Vitamina D3 400 UI: 1 tableta diaria después de la cena.`,
    instructions: 
`Tomar abundante agua (mínimo 2 a 2.5 litros al día).
Evitar consumir el hierro al mismo tiempo que la leche o quesos para optimizar la absorción.
Consultar de urgencia ante: sangrado genital, pérdida de líquido, dolor abdominal intenso, cefalea pulsátil o disminución de movimientos fetales.`,
    labOrders: [
      'Hematología completa',
      'Glicemia basal y Curva de tolerancia a la glucosa (75g)',
      'Uroanálisis + Urocultivo con antibiograma',
      'Perfil infeccioso TORCH (Toxoplasmosis IgG/IgM, Citomegalovirus, Rubeola)',
      'VDRL y VIH prueba rápida (ELISA 4ta generación)',
      'Tipaje sanguíneo y Factor Rh (con Coombs indirecto si Rh negativo)',
    ],
  },
  {
    id: 'temp-vaginitis',
    title: 'Tratamiento Vaginosis Mixta / Candidiasis',
    medications: 
`1. Metronidazol 500 mg + Nistatina 100.000 UI óvulos vaginales: Aplicar 1 óvulo profundo por las noches por 10 días continuos.
2. Fluconazol 150 mg cápsula: Tomar 1 cápsula vía oral única dosis (repetir a las 72h si persisten síntomas).
3. Ketoconazol crema tópica al 2%: Aplicar capa fina en región vulvar externa 2 veces al día por 7 días.`,
    instructions: 
`Abstenerse de relaciones sexuales durante los días de aplicación de los óvulos.
Utilizar ropa interior de algodón holgada y evitar protectores diarios perfumados.
Tratamiento para la pareja si presenta prurito o balanitis: Fluconazol 150 mg vía oral dosis única.`,
    labOrders: ['Cultivo y frotis de secreción vaginal con tinción de Gram'],
  },
  {
    id: 'temp-dismenorrea',
    title: 'Control de Dismenorrea y Hemorragia Catamenial',
    medications: 
`1. Ácido Mefenámico 500 mg tabletas: Tomar 1 tableta cada 8 horas con las comidas desde 24 horas antes del sangrado o con el inicio del dolor.
2. Ácido Tranexámico 500 mg tabletas: Tomar 1 tableta cada 8 horas durante los días de sangrado abundante (máximo 4 días).
3. Hioscina Butilbromuro 20 mg: Tomar 1 tableta en caso de cólicos intensos (máximo cada 8h).`,
    instructions: 
`Mantener registro en calendario menstrual de los días de sangrado y cantidad de toallas sanitarias utilizadas por jornada.
Aplicar compresas tibias en bajo vientre para aliviar el vasoespasmo miometrial.`,
    labOrders: [
      'Hematología y Ferritina sérica',
      'Perfil tiroideo (TSH, T4 libre)',
      'Ecografía pélvica transvaginal post-menstrual',
    ],
  },
];

/**
 * Fusiona los procedimientos maestros con los servicios personalizados cargados por la empresa
 * en el catálogo de inventario (`tenantItems`).
 */
export function mergeTenantGinecoServices(
  tenantItems: Array<{
    id: string;
    name: string;
    base_price?: number;
    type?: string;
    is_active?: boolean;
    metadata?: any;
  }>
): GinecoProcedureDefinition[] {
  const customProcedures: GinecoProcedureDefinition[] = [];
  const disabledMasterNames = new Set<string>();

  for (const item of tenantItems || []) {
    if (item.type === 'service') {
      if (item.is_active === false) {
        disabledMasterNames.add(item.name.toLowerCase().trim());
        continue;
      }

      const existingMatch = GINECO_PROCEDURES_MASTER.find(
        (p) => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );

      if (existingMatch) {
        customProcedures.push({
          ...existingMatch,
          id: item.id,
          name: item.name,
          category: (item.metadata?.category || existingMatch.category) as any,
          categoryLabel: item.metadata?.categoryLabel || existingMatch.categoryLabel,
          defaultPriceUSD: Number(item.base_price !== undefined ? item.base_price : existingMatch.defaultPriceUSD),
          estimatedDurationMin: Number(item.metadata?.duration_minutes || existingMatch.estimatedDurationMin),
        });
      } else if (item.metadata?.specialty === 'ginecologia' || item.metadata?.source_module === 'ginecologia') {
        const cat = item.metadata?.category || 'procedimientos';
        customProcedures.push({
          id: item.id,
          code: `GIN-${item.id.slice(0, 4).toUpperCase()}`,
          name: item.name,
          category: cat as any,
          categoryLabel: item.metadata?.categoryLabel || 'Procedimiento Personalizado',
          defaultPriceUSD: Number(item.base_price || 50),
          estimatedDurationMin: Number(item.metadata?.duration_minutes || 45),
          sessionsRequired: Number(item.metadata?.sessionsRequired || 1),
          color: item.metadata?.color || '#ec4899',
          stages: Array.isArray(item.metadata?.stages)
            ? item.metadata.stages
            : [{ id: `stg-custom-1`, title: `Ejecución de ${item.name}`, order: 1, sessionNumber: 1 }],
        });
      }
    }
  }

  for (const master of GINECO_PROCEDURES_MASTER) {
    if (disabledMasterNames.has(master.name.toLowerCase().trim())) {
      continue;
    }
    const alreadyIncluded = customProcedures.some(
      (p) => p.name.toLowerCase().trim() === master.name.toLowerCase().trim()
    );
    if (!alreadyIncluded) {
      customProcedures.push(master);
    }
  }

  return customProcedures;
}
