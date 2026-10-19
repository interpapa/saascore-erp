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
  {
    id: 'proc-gin-17',
    code: 'GIN-17',
    name: 'Biopsia de Endometrio (Cánula de Pipelle)',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico & Patología Cervical',
    defaultPriceUSD: 95.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#6366f1', // indigo-500
    stages: [
      { id: 'stg-1', title: 'Asepsia de cérvix e histerometría cuidadosa', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Aspiración endometrial con cánula de Pipelle rotatoria 360°', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Fijación de tejido para estudio de anatomía patológica', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-24',
    code: 'GIN-24',
    name: 'Test Molecular de VPH ADN (Tipificación Alto Riesgo)',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico & Patología Cervical',
    defaultPriceUSD: 75.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    color: '#8b5cf6', // violet-500
    stages: [
      { id: 'stg-1', title: 'Muestreo endocervical con cepillo de conservación molecular', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Conservación en medio líquido para PCR en tiempo real', order: 2, sessionNumber: 1 },
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
    id: 'proc-gin-18',
    code: 'GIN-18',
    name: 'Ecografía Mamaria Bilateral Alta Resolución',
    category: 'diagnostico',
    categoryLabel: 'Ecografía Especializada',
    defaultPriceUSD: 60.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#059669', // emerald-600
    stages: [
      { id: 'stg-1', title: 'Barrido radial de cuadrantes mamarios y retroareolar', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Exploración de cadenas ganglionares axilares bilaterales', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Clasificación ecográfica BI-RADS', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-23',
    code: 'GIN-23',
    name: 'Sonohisterografía / Histerosonografía',
    category: 'diagnostico',
    categoryLabel: 'Ecografía Especializada',
    defaultPriceUSD: 95.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#0d9488', // teal-600
    stages: [
      { id: 'stg-1', title: 'Cateterización cervical con sonda estéril 5-7 Fr', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Instilación de solución salina estéril y visualización transvaginal', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Delimitación de pólipos, miomas submucosos o sinequias', order: 3, sessionNumber: 1 },
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
  {
    id: 'proc-gin-19',
    code: 'GIN-19',
    name: 'Monitoreo Fetal No Estresante (NST / Cardiotocografía)',
    category: 'obstetricia',
    categoryLabel: 'Obstetricia & Embarazo',
    defaultPriceUSD: 45.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#0284c7', // sky-600
    stages: [
      { id: 'stg-1', title: 'Colocación de tocodinamómetro y transductor de FCF ultrasónico', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Registro continuo de reactividad fetal durante 20-30 minutos', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Interpretación de línea de base, variabilidad y aceleraciones', order: 3, sessionNumber: 1 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. PROCEDIMIENTOS DE CONSULTORIO & CIRUGÍAS MENORES
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
  {
    id: 'proc-gin-20',
    code: 'GIN-20',
    name: 'Drenaje / Marsupialización de Glándula de Bartholino',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 110.0,
    estimatedDurationMin: 40,
    sessionsRequired: 2,
    color: '#dc2626', // red-600
    stages: [
      { id: 'stg-1', title: 'Infiltración anestésica local e incisión en cara vestibular', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Drenaje de exudado, lavado con solución y eversión de bordes o catéter Word', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Curación y revisión de cicatrización a los 7 días', order: 3, sessionNumber: 2 },
    ],
  },
  {
    id: 'proc-gin-21',
    code: 'GIN-21',
    name: 'Conización Cervical LEEP / Asa Diatérmica',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 180.0,
    estimatedDurationMin: 45,
    sessionsRequired: 2,
    color: '#b91c1c', // red-700
    stages: [
      { id: 'stg-1', title: 'Bloqueo paracervical y tinción con Lugol', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Escisión en asa de la zona de transformación y canal endocervical', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Electrofulguración del lecho con bola rodante y hemostasia con Monsel', order: 3, sessionNumber: 1 },
      { id: 'stg-4', title: 'Control a las 4 semanas y entrega de informe histológico', order: 4, sessionNumber: 2 },
    ],
  },
  {
    id: 'proc-gin-22',
    code: 'GIN-22',
    name: 'Aspiración Manual Endouterina (AMEU) / Legrado',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 160.0,
    estimatedDurationMin: 40,
    sessionsRequired: 2,
    color: '#be185d', // pink-700
    stages: [
      { id: 'stg-1', title: 'Premedicación analgésica y bloqueo paracervical', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Evacuación endouterina con cánula Karman y jeringa de vacío AMEU', order: 2, sessionNumber: 1 },
      { id: 'stg-3', title: 'Comprobación ecográfica transabdominal de cavidad limpia', order: 3, sessionNumber: 1 },
      { id: 'stg-4', title: 'Control ecográfico post-evacuación a los 10 días', order: 4, sessionNumber: 2 },
    ],
  },
  {
    id: 'proc-gin-25',
    code: 'GIN-25',
    name: 'Curación y Retiro de Puntos Quirúrgicos / Cesárea',
    category: 'procedimientos',
    categoryLabel: 'Procedimientos en Consultorio',
    defaultPriceUSD: 25.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    color: '#475569', // slate-600
    stages: [
      { id: 'stg-1', title: 'Antisepsia de la herida quirúrgica y evaluación de cicatrización', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Retiro atraumático de sutura / grapas y aplicación de antiséptico', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'proc-gin-26',
    code: 'GIN-26',
    name: 'Paquete de Atención de Cesárea / Parto Planificado',
    category: 'obstetricia',
    categoryLabel: 'Obstetricia & Embarazo',
    defaultPriceUSD: 650.0,
    estimatedDurationMin: 120,
    sessionsRequired: 3,
    color: '#9f1239', // rose-800
    stages: [
      { id: 'stg-1', title: 'Evaluación prequirúrgica y monitoreo fetal preoperatorio', order: 1, sessionNumber: 1 },
      { id: 'stg-2', title: 'Acto quirúrgico / atención de nacimiento y puerperio inmediato', order: 2, sessionNumber: 2 },
      { id: 'stg-3', title: 'Control puerperal a los 7 y 30 días post-parto', order: 3, sessionNumber: 3 },
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATÁLOGO DE CIE-10 GINECO-OBSTÉTRICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const GINECO_CIE10_CATALOG: Array<{ code: string; description: string; category: string }> = [
  { code: 'Z34.0', description: 'Supervisión de primer embarazo normal (Primigesta)', category: 'Obstetricia' },
  { code: 'Z34.8', description: 'Supervisión de otros embarazos normales (Multípara)', category: 'Obstetricia' },
  { code: 'Z35.9', description: 'Supervisión de embarazo de alto riesgo, no especificado', category: 'Obstetricia' },
  { code: 'O14.0', description: 'Preeclampsia leve o moderada', category: 'Obstetricia' },
  { code: 'O14.1', description: 'Preeclampsia severa / Síndrome de HELLP', category: 'Obstetricia' },
  { code: 'O24.4', description: 'Diabetes mellitus que se origina con el embarazo (Gestacional)', category: 'Obstetricia' },
  { code: 'O20.0', description: 'Amenaza de aborto', category: 'Obstetricia' },
  { code: 'O23.4', description: 'Infección no especificada de las vías urinarias en el embarazo', category: 'Obstetricia' },
  { code: 'O60.0', description: 'Amenaza de parto prematuro', category: 'Obstetricia' },
  { code: 'O44.1', description: 'Placenta previa con hemorragia', category: 'Obstetricia' },
  { code: 'N76.0', description: 'Vaginitis aguda (Candidiasis / Vaginosis bacteriana)', category: 'Ginecología' },
  { code: 'N76.1', description: 'Vaginitis subaguda y crónica (Vaginitis mixta)', category: 'Ginecología' },
  { code: 'N92.0', description: 'Menstruación excesiva y frecuente con ciclo regular (Menorragia)', category: 'Ginecología' },
  { code: 'N94.6', description: 'Dismenorrea no especificada (Dolor menstrual pélvico)', category: 'Ginecología' },
  { code: 'N87.0', description: 'Displasia cervical leve (CIN I / LSIL)', category: 'Ginecología' },
  { code: 'N87.1', description: 'Displasia cervical moderada (CIN II / Lesión escamosa)', category: 'Ginecología' },
  { code: 'N87.2', description: 'Displasia cervical severa (CIN III / HSIL)', category: 'Ginecología' },
  { code: 'N80.0', description: 'Endometriosis del útero (Adenomiosis)', category: 'Ginecología' },
  { code: 'D25.0', description: 'Leiomioma submucoso del útero', category: 'Ginecología' },
  { code: 'N97.0', description: 'Infertilidad femenina asociada con anovulación (SOPQ)', category: 'Ginecología' },
  { code: 'N95.1', description: 'Estados menopáusicos y climatéricos femeninos', category: 'Ginecología' },
  { code: 'N75.1', description: 'Absceso de glándula de Bartholino', category: 'Ginecología' },
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
2. Sulfato Ferroso 300 mg (Hierro elemental 60 mg) + Vitamina C: 1 tableta diaria con jugo cítrico (lejos de lácteos).
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
    id: 'temp-preeclampsia-prev',
    title: 'Prevención Preeclampsia en Alto Riesgo',
    medications:
`1. Ácido Acetilsalicílico (Aspirina / AAS) 100 mg tabletas: Tomar 1 tableta vía oral todas las noches antes de dormir (iniciar antes de la semana 16).
2. Carbonato de Calcio 1500 mg día (en 2 tomas de 750 mg o 3 de 500 mg con alimentos).
3. Metildopa 250 mg: Tomar 1 tableta cada 8 horas si cifras de PA >= 140/90 mmHg.`,
    instructions:
`Monitoreo de presión arterial ambulatoria (mapa diario mañana y tarde).
Dieta normosódica, rica en proteínas y frutas frescas.
Acudir a emergencia obstétrica inmediata si presenta: dolor de cabeza opresivo que no cede, visión borrosa o con destellos luminosos (escotomas), dolor epigástrico en barra ("boca del estómago") o hinchazón súbita de cara y manos.`,
    labOrders: [
      'Relación Proteinuria/Creatininuria en muestra aislada de orina',
      'Enzimas hepáticas (TGO / AST, TGP / ALT)',
      'Deshidrogenasa Láctica (LDH)',
      'Ácido Úrico y Creatinina sérica',
      'Recuento de plaquetas y frotis sanguíneo',
      'Doppler de arterias uterinas (Semana 20-24)',
    ],
  },
  {
    id: 'temp-amenaza-aborto',
    title: 'Soporte Progestágeno / Amenaza de Aborto',
    medications:
`1. Progesterona micronizada 200 mg cápsulas blandas: Aplicar 1 cápsula vía vaginal profunda cada 12 horas hasta la semana 12-14 de gestación.
2. Hioscina Butilbromuro 10 mg tabletas: Tomar 1 tableta cada 8 horas en caso de presentar cólicos o dolor bajo vientre.
3. Reposo físico absoluto en cama por 72 horas; relativo posterior.`,
    instructions:
`Abstinencia sexual estricta.
Evitar levantar peso o esfuerzos físicos.
Reconsultar de inmediato si el sangrado se hace rojo vivo rutilante o supera la cantidad de una menstruación habitual.`,
    labOrders: [
      'Determinación cuantitativa seriada de Subunidad Beta-hCG (cada 48 horas)',
      'Ecografía pélvica transvaginal de control de viabilidad',
      'Hematología completa y tiempo de protrombina (TP/TPA)',
    ],
  },
  {
    id: 'temp-itu-embarazo',
    title: 'Infección Urinaria en Gestante (Cistitis/Bacteriuria)',
    medications:
`1. Nitrofurantoína macrocristales 100 mg cápsulas: Tomar 1 cápsula vía oral cada 12 horas con las comidas por 7 días.
(Alternativa: Cefalexina 500 mg cada 6 horas por 7 días).
2. Paracetamol / Acetaminofén 500 mg: Tomar 1 tableta cada 8 horas en caso de dolor o fiebre.`,
    instructions:
`Consumir mínimo 3 litros de agua al día para lavado mecánico de vías urinarias.
No demorar la micción (orinar cada 2-3 horas).
Completar estrictamente los 7 días de antibiótico aunque los síntomas hayan desaparecido.`,
    labOrders: [
      'Urocultivo con antibiograma de control a los 7 días de finalizar el tratamiento',
      'Examen simple de orina',
    ],
  },
  {
    id: 'temp-vaginitis',
    title: 'Tratamiento Vaginosis Mixta / Candidiasis',
    medications: 
`1. Metronidazol 500 mg + Nistatina 100.000 UI óvulos vaginales: Aplicar 1 óvulo profundo por las noches por 10 días continuos.
2. Fluconazol 150 mg cápsula: Tomar 1 cápsula vía oral única dosis (repetir a las 72h si persisten síntomas - NO usar en 1er trimestre de embarazo).
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
  {
    id: 'temp-anticoncepcion',
    title: 'Terapia de Regulación Hormonal y Anticoncepción',
    medications:
`1. Anticonceptivo combinado oral (Drospirenona 3 mg + Etinilestradiol 0.03 mg): Tomar 1 comprimido diario siempre a la misma hora durante 21 días consecutivos, seguido de 7 días de descanso.`,
    instructions:
`Iniciar la primera caja el 1er día del sangrado menstrual.
Si ocurre un olvido de menos de 12 horas, tomar el comprimido olvidado inmediatamente.
Si transcurren más de 12 horas, usar preservativo de barrera adicional por los próximos 7 días.`,
    labOrders: [
      'Perfil lipídico completo y enzimas hepáticas',
      'Citología cervical vigente',
    ],
  },
  {
    id: 'temp-its-tricomonas',
    title: 'Tratamiento Vaginitis por Tricomonas / ITS',
    medications:
`1. Metronidazol 500 mg tabletas: Tomar 1 tableta cada 12 horas por 7 días (Tratamiento simultáneo para la paciente Y para la pareja).
2. Azitromicina 500 mg: Tomar 2 tabletas juntas (1 g dosis única) vía oral.`,
    instructions:
`Prohibido consumir bebidas alcohólicas durante el tratamiento y hasta 48 horas después (Efecto antabuse / disulfiram).
Abstinencia sexual estricta hasta completar el tratamiento ambos miembros de la pareja.`,
    labOrders: [
      'Serología VDRL y Prueba rápida VIH',
      'Panel molecular / PCR para Chlamydia trachomatis y Neisseria gonorrhoeae',
    ],
  },
  {
    id: 'temp-climaterio',
    title: 'Terapia del Climaterio / Síntomas Menopáusicos',
    medications:
`1. Estriol crema vaginal 1 mg/g: Aplicar 1 aplicador intravaginal profundo al acostarse 2 veces por semana.
2. Calcio 600 mg + Vitamina D3 800 UI: Tomar 1 tableta diaria con el almuerzo.
3. Gel lubricante íntimo a base de agua con Ácido Hialurónico según necesidad.`,
    instructions:
`Realizar actividad física aeróbica y de fuerza 30 minutos al menos 4 veces por semana para salud ósea.
Exposición solar prudente 15 minutos matutinos.
Control ginecológico y mamográfico anual riguroso.`,
    labOrders: [
      'Densitometría Ósea (DEXA de columna y cadera)',
      'Mamografía digital bilateral de control',
      'Perfil lipídico y glicemia en ayunas',
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATÁLOGOS RÁPIDOS Y PRESETS CLÍNICOS PARA COMBOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

export const ALLERGY_PRESETS = [
  'Penicilina',
  'AINEs / Ibuprofeno',
  'Sulfas / Trimetoprim',
  'Yodo / Medios de contraste',
  'Dipirona / Metamizol',
  'Látex',
  'Cefalosporinas',
  'Eritromicina',
  'Ácido Acetilsalicílico (AAS)',
  'Ninguna conocida (NKDA)',
] as const;

export const MEDICATION_PRESETS = [
  'Ácido Fólico (5mg)',
  'Sulfato Ferroso / Hierro',
  'Polivitamínico Prenatal',
  'Calcio + Vitamina D3',
  'Levotiroxina',
  'Metformina',
  'Aspirina (AAS 100mg)',
  'Progesterona micronizada',
  'Metildopa (250/500mg)',
  'Nifedipino retard',
  'Ninguno',
] as const;

export const SURGERY_PRESETS = [
  'Cesárea Previa',
  'Apendicectomía',
  'Colecistectomía',
  'Miomectomía uterina',
  'Legrado / AMEU previo',
  'Esterilización Tubárica (Ligadura)',
  'Histerectomía',
  'Laparoscopia exploratoria',
  'Quistectomía ovárica',
  'Ninguna previa',
] as const;

export const FAMILY_ANTECEDENT_PRESETS = [
  'Hipertensión Arterial (HTA)',
  'Diabetes Mellitus',
  'Cáncer de Mama',
  'Cáncer de Cuello Uterino',
  'Cáncer de Ovario',
  'Preeclampsia / Eclampsia materna',
  'Embarazo Gemelar / Múltiple',
  'Enfermedad Tiroidea',
  'Cardiopatías isquémicas',
  'Sin antecedentes relevantes',
] as const;

export const MENSTRUAL_RHYTHM_PRESETS = [
  '28 x 4 (Regular - Eumenorrea)',
  '28 x 3 (Regular)',
  '30 x 4 (Regular)',
  '30 x 5 (Regular)',
  '21 x 3 (Polimenorrea)',
  '35 x 4 (Oligomenorrea)',
  'Irregular (Opsomenorrea)',
  'Amenorrea secundaria',
] as const;

export const CONTRACEPTIVE_PRESETS = [
  'Ninguno',
  'Anticonceptivos Orales (AOC)',
  'Minipíldora (Solo progestágeno)',
  'Inyectable Mensual (Mesigyna/Cyclofem)',
  'Inyectable Trimestral (Depo-Provera)',
  'DIU T de Cobre (TCu 380A)',
  'DIU Hormonal (Mirena / Kyleena)',
  'Implante Subdérmico (Jadelle / Implanon)',
  'Preservativo / De Barrera',
  'Esterilización Quirúrgica (Pomeroy)',
  'Método Natural / Ritmo',
] as const;

export const CESAREAN_REASON_PRESETS = [
  'ESTRECHA (Desproporción Céfalo-Pélvica)',
  'PODÁLICO / PELVIANO',
  'ITERATIVA (2 o más cesáreas)',
  'SFA (Sufrimiento Fetal Agudo)',
  'PLACENTA PREVIA OCLUSIVA',
  'DESPRENDIMIENTO DE PLACENTA (DPPNI)',
  'FALLA DE INDUCCIÓN / DETENCIÓN DE TRABAJO',
  'PREECLAMPSIA GRAVE / SÍNDROME HELLP',
  'EMBARAZO GEMELAR',
  'DISTOCIA DINÁMICA',
] as const;

export const ABORTION_TYPE_PRESETS = [
  'ESPONTÁNEO INCOMPLETO',
  'ESPONTÁNEO COMPLETO',
  'ANEMBRIONADO (Huevo Huero)',
  'RETENIDO / DIFERIDO',
  'TERAPÉUTICO (Causa médica)',
  'GESTACIÓN ECTÓPICA RESUELTA',
] as const;

export const ABORTION_RESOLUTION_PRESETS = [
  'AMEU (Aspiración Manual Endouterina)',
  'Legrado Uterino Instrumental (LUI)',
  'Manejo Médico (Misoprostol)',
  'Conducta Expectante / Expulsión Espontánea',
] as const;

export const BETHESDA_PRESETS = [
  'NILM (Negativo para lesión intraepitelial o malignidad)',
  'ASC-US (Células escamosas atípicas de significado indeterminado)',
  'ASC-H (No se descarta lesión de alto grado)',
  'L-SIL (Lesión intraepitelial de bajo grado / NIC I / VPH)',
  'H-SIL (Lesión intraepitelial de alto grado / NIC II - NIC III / CIS)',
  'Carcinoma de células escamosas',
  'AGC (Células glandulares atípicas)',
] as const;

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
