/**
 * Rendo Salud / SaaSCore - Registro Maestro de Especialidades Médicas, CIE-10,
 * Plantillas de Récipe y Catálogo de Procedimientos Clínicos Multi-Especialidad.
 *
 * Nota: Odontología se mantiene como un módulo especializado independiente en `/odontologia`.
 */

export type MedicalSpecialtyId =
  | 'med_general'
  | 'med_pediatria'
  | 'med_ginecologia'
  | 'med_dermatologia'
  | 'med_traumatologia'
  | 'med_oftalmologia';

export interface MedicalClinicalStage {
  id: string;
  title: string;
  order: number;
  sessionNumber?: number;
  description?: string;
}

export interface MedicalProcedureDefinition {
  id: string;
  code: string;
  specialtyId: MedicalSpecialtyId;
  name: string;
  categoryLabel: string;
  defaultPriceUSD: number;
  estimatedDurationMin: number;
  sessionsRequired: number;
  stages: MedicalClinicalStage[];
  color: string;
}

export interface MedicalSpecialtyConfig {
  id: MedicalSpecialtyId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  badgeBg: string;
  commonCie10: Array<{ code: string; description: string }>;
  prescriptionTemplates: Array<{
    id: string;
    title: string;
    medications: string;
    instructions: string;
    labOrders?: string[];
  }>;
}

export const MEDICAL_SPECIALTIES_MAP: Record<MedicalSpecialtyId, MedicalSpecialtyConfig> = {
  med_general: {
    id: 'med_general',
    name: 'Medicina General & Interna',
    shortName: 'Med. General',
    description: 'Atención primaria integral, triaje metabólico, riesgo cardiovascular, evaluación preoperatoria y urgencias ambulatorias.',
    color: '#0284c7',
    badgeBg: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    commonCie10: [
      { code: 'I10', description: 'Hipertensión esencial (primaria)' },
      { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones' },
      { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores' },
      { code: 'K29.7', description: 'Gastritis, no especificada / Enfermedad ácido-péptica' },
      { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado' },
      { code: 'E78.5', description: 'Hiperlipidemia mixta / Dislipidemia metabólica' },
      { code: 'R51', description: 'Cefalea tensional / migrañosa en estudio' },
      { code: 'Z01.8', description: 'Examen especial preoperatorio cardiovascular' },
    ],
    prescriptionTemplates: [
      {
        id: 'tpl-mg-hta',
        title: 'Control Hipertensión Arterial Estadio 1',
        medications:
          '1. Losartán Potásico 50 mg (Tabletas) — Caja x 30\n2. Amlodipino 5 mg (Tabletas) — Caja x 30',
        instructions:
          '• Tomar 1 tableta de Losartán 50 mg vía oral cada 24 horas (8:00 AM).\n• Si la PA sistólica persiste > 140 mmHg en la noche, asociar Amlodipino 5 mg a las 8:00 PM.\n• Dieta hiposódica estricta (<2g sal/día) y caminata aeróbica 30 min diarios.\n• Llevar bitácora ambulatoria de presión arterial por 7 días.',
        labOrders: [
          'Hematología Completa',
          'Glicemia en Ayunas y HbA1c',
          'Perfil Lipídico Completo (Colesterol Total, HDL, LDL, Triglicéridos)',
          'Urea, Creatinina y Electrolitos Séricos (Na, K, Cl)',
          'Examen Simple de Orina',
        ],
      },
      {
        id: 'tpl-mg-ivu',
        title: 'Infección Urinaria Baja No Complicada (Cistitis)',
        medications:
          '1. Ciprofloxacina 500 mg (Tabletas) — 14 tabletas (o Fosfomicina Trometamol 3g sobre único)\n2. Fenazopiridina 200 mg (Tabletas) — 9 tabletas',
        instructions:
          '• Tomar 1 tableta de Ciprofloxacina 500 mg cada 12 horas por 7 días continuos.\n• Tomar 1 tableta de Fenazopiridina 200 mg cada 8 horas por 3 días (después de las comidas; advierte coloración naranja en la orina).\n• Abundante ingesta hídrica (>2.5 litros de agua al día).',
        labOrders: ['Examen Simple de Orina con Sedimento', 'Urocultivo y Antibiograma (previo al inicio antibiótico)'],
      },
      {
        id: 'tpl-mg-ira',
        title: 'Faringoamigdalitis / Síndrome Viral Respiratorio Alto',
        medications:
          '1. Paracetamol (Acetaminofén) 500 mg (Tabletas) — 15 tabletas\n2. Desloratadina 5 mg (Tabletas) — 10 tabletas\n3. Ibuprofeno 400 mg (Cápsulas blandas) — 12 cápsulas',
        instructions:
          '• Tomar Paracetamol 500 mg cada 8 horas si hay fiebre > 38°C o malestar general.\n• Tomar Desloratadina 5 mg 1 vez al día por 5 días para congestión nasal.\n• Tomar Ibuprofeno 400 mg cada 8 horas con alimentos por 4 días para odinofagia.\n• Lavados nasales con solución salina fisiológica cada 8 horas.',
        labOrders: ['Hematología Completa con Plaquetas', 'Proteína C Reactiva (PCR) cuantitativa'],
      },
      {
        id: 'tpl-mg-gas',
        title: 'Gastritis Aguda / Reflujo Gastroesofágico (ERGE)',
        medications:
          '1. Esomeprazol 40 mg (Cápsulas) — Caja x 30\n2. Sucralfato 1 g / 5 ml (Suspensión oral) — 1 frasco\n3. Domperidona 10 mg (Tabletas) — 20 tabletas',
        instructions:
          '• Tomar 1 cápsula de Esomeprazol 40 mg en ayunas (30 min antes del desayuno) por 4 semanas.\n• Tomar 10 ml de Sucralfato 1 hora después de cada comida principal y al acostarse por 10 días.\n• Evitar café, cítricos, picantes, grasas, AINEs y no acostarse antes de 2 horas tras cenar.',
        labOrders: ['Antígeno Fecal para Helicobacter pylori', 'Perfil Hepático (TGO, TGP, Bilirrubina)'],
      },
    ],
  },

  med_pediatria: {
    id: 'med_pediatria',
    name: 'Pediatría & Puericultura',
    shortName: 'Pediatría',
    description: 'Control de niño sano, desarrollo psicomotor, inmunizaciones PAI, dosificación ponderal mg/kg y patología aguda infantil.',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    commonCie10: [
      { code: 'Z00.1', description: 'Control de salud de rutina del niño (Niño Sano)' },
      { code: 'J02.9', description: 'Faringitis aguda pediátrica, no especificada' },
      { code: 'J20.9', description: 'Bronquitis aguda / Síndrome broncoobstructivo' },
      { code: 'A09.9', description: 'Gastroenteritis y colitis infecciosa aguda (EDA)' },
      { code: 'H66.9', description: 'Otitis media aguda supurativa / no especificada' },
      { code: 'L20.9', description: 'Dermatitis atópica infantil' },
      { code: 'Z27.9', description: 'Necesidad de inmunización combinada (Vacunación)' },
    ],
    prescriptionTemplates: [
      {
        id: 'tpl-ped-fiebre',
        title: 'Manejo Antipirético y Analgésico Ponderal',
        medications:
          '1. Acetaminofén Jarabe Pediátrico (160 mg / 5 ml) — 1 frasco\n2. Ibuprofeno Suspensión Pediátrica (100 mg / 5 ml) — 1 frasco',
        instructions:
          '• Administrar Acetaminofén según dosis calculada en consulta (15 mg/kg/dosis) vía oral cada 6 horas si la temperatura axilar supera 38.0 °C.\n• Medios físicos con agua tibia (nunca alcohol ni agua helada) si persiste febrícula.\n• Acudir a urgencias si presenta letargia, tiraje subcostal o rechazo absoluto a líquidos.',
        labOrders: ['Hematología Completa', 'Examen Simple de Orina (descarte foco oculto)'],
      },
      {
        id: 'tpl-ped-oma',
        title: 'Otitis Media Aguda / Amigdalitis Bacteriana Infantil',
        medications:
          '1. Amoxicilina + Ácido Clavulánico Suspensión (400 mg / 5 ml) — 1 frasco\n2. Ibuprofeno Suspensión (100 mg / 5 ml) — 1 frasco\n3. Probiótico Infantil (Bacillus clausii / L. rhamnosus) — 10 viales',
        instructions:
          '• Administrar Amoxicilina/Clavulánico a razón de 80-90 mg/kg/día dividido cada 12 horas por 7 a 10 días con las comidas.\n• Administrar 1 vial oral de probiótico al día (separado 2 horas del antibiótico) para prevenir diarrea asociada.\n• Mantener oído seco durante el baño.',
      },
      {
        id: 'tpl-ped-eda',
        title: 'Gastroenteritis Aguda — Plan A de Hidratación OMS',
        medications:
          '1. Sales de Rehidratación Oral Pediátricas (SRO 60-75 mEq/L) — 4 sobres\n2. Sulfato de Zinc Jarabe (10 mg / 5 ml) — 1 frasco\n3. Saccharomyces boulardii 250 mg (Sobres) — 10 sobres',
        instructions:
          '• Ofrecer SRO a libre demanda tras cada evacuación líquida (50-100 ml en <2 años; 100-200 ml en >2 años).\n• Administrar Sulfato de Zinc 10 ml (20 mg) una vez al día por 10 a 14 días continuos.\n• Diluir 1 sobre de probiótico cada 12 horas en agua o leche tibia.\n• Continuar lactancia materna o dieta astringente fraccionada (no suspender alimentación).',
        labOrders: ['Coproanálisis Seriado y Leucocitos Fecales', 'Rotavirus / Adenovirus en heces'],
      },
    ],
  },

  med_ginecologia: {
    id: 'med_ginecologia',
    name: 'Ginecología & Obstetricia',
    shortName: 'Ginecología',
    description: 'Control prenatal, rueda obstétrica (FUR/FPP), colposcopia, pesquisa citológica Papanicolaou, ecografía pélvica y planificación.',
    color: '#ec4899',
    badgeBg: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    commonCie10: [
      { code: 'Z34.9', description: 'Supervisión de embarazo normal, trimestre actual' },
      { code: 'Z01.4', description: 'Examen ginecológico anual de rutina (Citología / Papanicolaou)' },
      { code: 'E28.2', description: 'Síndrome de ovario poliquístico (SOP)' },
      { code: 'N76.0', description: 'Vaginitis aguda / Vulvovaginitis infecciosa' },
      { code: 'N92.0', description: 'Menstruación excesiva y frecuente con ciclo regular (Menorragia)' },
      { code: 'Z30.1', description: 'Inserción de dispositivo anticonceptivo intrauterino (DIU)' },
      { code: 'N87.9', description: 'Displasia del cuello uterino, no especificada (NIC)' },
    ],
    prescriptionTemplates: [
      {
        id: 'tpl-gin-prenatal',
        title: 'Suplementación Prenatal Trimestral Estándar',
        medications:
          '1. Ácido Fólico 5 mg (Tabletas) — Caja x 30\n2. Hierro Polimaltosado 100 mg (Tabletas masticables) — Caja x 30\n3. Carbonato o Citrato de Calcio 600 mg + Vitamina D3 — Caja x 30\n4. Multivitamínico Prenatal con DHA (Omega-3) — Caja x 30',
        instructions:
          '• Tomar 1 tableta de Ácido Fólico 5 mg en la mañana.\n• Tomar 1 tableta de Hierro a media mañana con jugo cítrico (lejos de lácteos).\n• Tomar 1 tableta de Calcio + Vitamina D después del almuerzo.\n• Acudir de inmediato por emergencia si presenta sangrado transvaginal, pérdida de líquido amniótico, cefalea intensa o disminución de movimientos fetales.',
        labOrders: [
          'Hematología Completa y Tipiaje Sanguíneo ABO/Rh',
          'Glicemia en Ayunas y Prueba de Tolerancia Oral a la Glucosa (PTOG 75g)',
          'VDRL, HIV, Hepatitis B (HBsAg) y Toxoplasmosis IgG/IgM',
          'Examen Simple de Orina y Urocultivo',
        ],
      },
      {
        id: 'tpl-gin-vaginitis',
        title: 'Vulvovaginitis Mixta (Candidiasis / Vaginosis)',
        medications:
          '1. Clotrimazol 200 mg + Metronidazol 500 mg (Óvulos vaginales) — Caja x 7\n2. Fluconazol 150 mg (Cápsula oral) — 2 cápsulas\n3. Gel íntimo pH ácido láctico — 1 frasco',
        instructions:
          '• Colocar 1 óvulo profundamente vía vaginal cada noche al acostarse por 7 noches consecutivas.\n• Tomar 1 cápsula de Fluconazol 150 mg vía oral dosis única (repetir la 2da cápsula a las 72 horas si el prurito es severo).\n• Abstinencia sexual durante los 7 días del tratamiento.',
        labOrders: ['Exudado y Cultivo de Secreción Vaginal'],
      },
      {
        id: 'tpl-gin-sop',
        title: 'Manejo Metabólico y Hormonal de Ovario Poliquístico (SOP)',
        medications:
          '1. Mio-Inositol 2000 mg + Ácido Fólico 200 mcg (Sobres) — Caja x 30\n2. Anticonceptivo Oral Combinado (Drospirenona 3 mg / Etinilestradiol 0.03 mg) — 1 blíster\n3. Metformina XR 500 mg (Tabletas liberación prolongada) — Caja x 30',
        instructions:
          '• Diluir 1 sobre de Mio-Inositol en agua cada 12 horas.\n• Iniciar el blíster anticonceptivo el primer día del ciclo menstrual a la misma hora.\n• Tomar Metformina XR 500 mg con la cena.',
        labOrders: ['Perfil Hormonal Ginecológico (FSH, LH, Estradiol, Prolactina, TSH, Testosterona Libre)', 'Insulina Basal y Postprandial (Índice HOMA-IR)'],
      },
    ],
  },

  med_dermatologia: {
    id: 'med_dermatologia',
    name: 'Dermatología Clínica & Quirúrgica',
    shortName: 'Dermatología',
    description: 'Dermatoscopia digital, crioterapia, biopsias cutáneas, electrocauterización, acné severo, lesiones pigmentadas y dermoestética.',
    color: '#8b5cf6',
    badgeBg: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    commonCie10: [
      { code: 'L70.0', description: 'Acné vulgar moderado a severo' },
      { code: 'L20.8', description: 'Dermatitis atópica / Eccema flexural' },
      { code: 'L40.0', description: 'Psoriasis vulgar en placas' },
      { code: 'B07', description: 'Verrugas víricas cutáneas / Molusco contagioso' },
      { code: 'L81.1', description: 'Melasma / Hiperpigmentación facial epidérmica' },
      { code: 'D22.9', description: 'Nevo melanocítico atípico en seguimiento dermatoscópico' },
      { code: 'L30.9', description: 'Dermatitis de contacto / Urticaria aguda' },
    ],
    prescriptionTemplates: [
      {
        id: 'tpl-der-acne',
        title: 'Protocolo Dermo-Terapéutico para Acné Inflamatorio',
        medications:
          '1. Gel Limpiador Syndet Seborregulador (Ácido Salicílico 2%) — 1 frasco\n2. Adapaleno 0.1% + Peróxido de Benzoilo 2.5% (Gel tópico) — 1 tubo\n3. Doxiciclina 100 mg (Cápsulas) — Caja x 30\n4. Fotoprotector Facial Toque Seco Oil-Free SPF 50+ — 1 tubo',
        instructions:
          '• Lavar el rostro mañana y noche con el limpiador seborregulador.\n• En las noches, sobre piel completamente seca, aplicar una capa fina (tamaño de un guisante) de Adapaleno/Peróxido evitando contorno de ojos y comisuras labiales.\n• Tomar 1 cápsula de Doxiciclina 100 mg después del almuerzo con abundante agua por 30 días.\n• Aplicar fotoprotector SPF 50+ a las 8:00 AM y reaplicar a las 12:30 PM.',
        labOrders: ['Perfil Hepático (TGO, TGP)', 'Perfil Lipídico Basal'],
      },
      {
        id: 'tpl-der-postproc',
        title: 'Cuidados Post-Cauterización / Crioterapia / Biopsia Cutánea',
        medications:
          '1. Mupirocina 2% (Ungüento tópico antibiótico) — 1 tubo 15g\n2. Crema Reparadora Cicatrizante (Pantenol 5% + Madecassoside) — 1 tubo\n3. Protector Solar Mineral SPF 50+ — 1 tubo',
        instructions:
          '• Lavar el área tratada suavemente con agua y jabón neutro 2 veces al día.\n• Aplicar Mupirocina 2% sobre la lesión cada 12 horas durante los primeros 7 días.\n• Al caer la costra de forma natural (NO arrancar), iniciar crema reparadora y protector solar estricto para evitar hiperpigmentación post-inflamatoria.',
      },
      {
        id: 'tpl-der-ecze',
        title: 'Brote Agudo de Dermatitis Atópica / Eccema de Contacto',
        medications:
          '1. Mometasona Furoato 0.1% (Crema) — 1 tubo\n2. Emoliente Intensivo Restaurador de Barrera (Ceramidas) — 1 envase 400ml\n3. Levocetirizina 5 mg (Tabletas) — Caja x 10',
        instructions:
          '• Aplicar Mometasona 0.1% en capa fina sobre las placas eritematosas únicamente por la noche durante 7 días.\n• Aplicar crema emoliente abundante 3 veces al día, especialmente dentro de los 3 minutos posteriores al baño.\n• Tomar 1 tableta de Levocetirizina 5 mg a las 8:00 PM para control del prurito.',
      },
    ],
  },

  med_traumatologia: {
    id: 'med_traumatologia',
    name: 'Traumatología, Ortopedia & Rehabilitación',
    shortName: 'Traumatología',
    description: 'Fracturas, inmovilizaciones con yeso o fibra, infiltraciones intraarticulares, medicina deportiva y planes de fisioterapia.',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    commonCie10: [
      { code: 'M54.5', description: 'Lumbago no especificado / Lumbociatalgia mecánica' },
      { code: 'S93.4', description: 'Esguince y torcedura del tobillo (Ligamento lateral)' },
      { code: 'M17.9', description: 'Gonartrosis (Artrosis de rodilla), no especificada' },
      { code: 'M75.1', description: 'Síndrome del manguito rotador del hombro' },
      { code: 'S52.5', description: 'Fractura de la epífisis inferior del radio (Colles/Distal)' },
      { code: 'M77.1', description: 'Epicondilitis lateral (Codo de tenista)' },
      { code: 'M72.2', description: 'Fascitis plantar / Espolón calcáneo' },
    ],
    prescriptionTemplates: [
      {
        id: 'tpl-tra-esguince',
        title: 'Protocolo RICE + Analgesia para Esguince / Traumatismo Agudo',
        medications:
          '1. Etoricoxib 90 mg (Tabletas) — Caja x 7 (o Celecoxib 200 mg)\n2. Tiocolchicósido 4 mg (Tabletas relajante muscular) — Caja x 10\n3. Diclofenaco Dietilamina Gel Tópico — 1 tubo',
        instructions:
          '• Tomar 1 tableta de Etoricoxib 90 mg después del almuerzo por 5 a 7 días.\n• Tomar 1 tableta de Tiocolchicósido 4 mg cada 12 horas por 5 días.\n• Protocolo RICE las primeras 72 horas: Reposo relativo, Hielo local 15 min cada 4 horas (protegiendo la piel), Compresión elástica y Elevación del miembro.',
        labOrders: ['Radiografía AP y Lateral comparativa de la articulación afectada', 'Ecografía Musculoesquelética de partes blandas'],
      },
      {
        id: 'tpl-tra-lumbago',
        title: 'Manejo de Lumbociatalgia Aguda / Contractura Paravertebral',
        medications:
          '1. Dexketoprofeno 25 mg (Tabletas) — Caja x 15\n2. Ciclobenzaprina 10 mg (Tabletas) — Caja x 10\n3. Complejo Vitamínico Neurotropo B1-B6-B12 — Caja x 30',
        instructions:
          '• Tomar Dexketoprofeno 25 mg cada 8 horas por 5 días con alimentos.\n• Tomar Ciclobenzaprina 10 mg a las 9:00 PM por 7 noches (puede producir somnolencia).\n• Tomar 1 tableta de Complejo B al día por 30 días.\n• Iniciar sesiones de rehabilitación física una vez ceda la fase hiperálgica.',
        labOrders: ['Resonancia Magnética (RMN) de Columna Lumbosacra sin contraste'],
      },
      {
        id: 'tpl-tra-artrosis',
        title: 'Condroprotección y Manejo de Gonartrosis / Desgaste Articular',
        medications:
          '1. Sulfato de Glucosamina 1500 mg + Condroitina 1200 mg (Sobres) — Caja x 30\n2. Colágeno Hidrolizado Tipo II + Magnesio — 1 envase\n3. Meloxicam 15 mg (Tabletas) — Caja x 10',
        instructions:
          '• Diluir 1 sobre de Glucosamina/Condroitina en un vaso de agua con el desayuno diariamente por 3 meses.\n• Tomar Meloxicam 15 mg 1 vez al día solo en ciclos cortos de 5 días si presenta crisis de dolor articular.\n• Fortalecimiento isométrico de cuádriceps y reducción de impacto.',
        labOrders: ['Radiografía de Rodillas AP con apoyo bipodal y Axial de rótula'],
      },
    ],
  },

  med_oftalmologia: {
    id: 'med_oftalmologia',
    name: 'Oftalmología & Optometría Clínica',
    shortName: 'Oftalmología',
    description: 'Agudeza visual Snellen, refracción computarizada, tonometría ocular (PIO), biomicroscopía en lámpara de hendidura y fondo de ojo.',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    commonCie10: [
      { code: 'H52.1', description: 'Miopía / Astigmatismo miópico compuesto' },
      { code: 'H52.4', description: 'Presbicia' },
      { code: 'H10.9', description: 'Conjuntivitis aguda, no especificada' },
      { code: 'H04.1', description: 'Síndrome de ojo seco / Disfunción lagrimal' },
      { code: 'H40.1', description: 'Glaucoma primario de ángulo abierto / Hipertensión ocular' },
      { code: 'H00.1', description: 'Chalazión / Orzuelo palpebral' },
      { code: 'H25.9', description: 'Catarata senil en evaluación quirúrgica' },
      { code: 'T15.0', description: 'Cuerpo extraño en la córnea' },
    ],
    prescriptionTemplates: [
      {
        id: 'tpl-oft-conj',
        title: 'Conjuntivitis Bacteriana / Blefaroconjuntivitis Aguda',
        medications:
          '1. Tobramicina 0.3% + Dexametasona 0.1% (Gotas oftálmicas) — 1 frasco gotero\n2. Hialuronato de Sodio 0.4% Libre de Conservantes (Lágrimas artificiales) — 1 frasco\n3. Espuma Limpiadora Palpebral con Tea Tree Oil — 1 frasco',
        instructions:
          '• Instilar 1 gota de Tobramicina/Dexametasona en el saco conjuntival del ojo afectado cada 6 horas por 7 días.\n• Instilar 1 gota de Hialuronato de Sodio cada 4 horas para lubricación corneal.\n• Realizar higiene de bordes palpebrales mañana y noche. No frotar los ojos ni compartir toallas.',
      },
      {
        id: 'tpl-oft-ojoseco',
        title: 'Síndrome de Ojo Seco Evaporativo y Fatiga Visual Digital',
        medications:
          '1. Carboximetilcelulosa + Glicerina (Gotas lubricantes) — 1 frasco\n2. Gel Oftálmico de Carbómero 0.2% (Nocturno) — 1 tubo\n3. Suplemento de Ácidos Grasos Omega-3 1000 mg — Caja x 30',
        instructions:
          '• Instilar 1 gota de lubricante ocular en ambos ojos 4 veces al día.\n• Aplicar 1 gota de gel de Carbómero en ambos ojos antes de dormir.\n• Aplicar regla 20-20-20 frente al computador (cada 20 min, mirar a 20 pies durante 20 segundos) y compresas tibias palpebrales 5 min en la noche.',
      },
      {
        id: 'tpl-oft-glaucoma',
        title: 'Control Hipotensor de Glaucoma / Hipertensión Ocular (PIO Elevada)',
        medications:
          '1. Latanoprost 0.005% (Gotas oftálmicas) — 1 frasco\n2. Dorzolamida 2% + Timolol 0.5% Libre de Conservantes (Gotas) — 1 frasco',
        instructions:
          '• Instilar 1 gota de Latanoprost en ambos ojos estrictamente a las 9:00 PM todos los días (no suspender).\n• Instilar 1 gota de Dorzolamida/Timolol en ambos ojos cada 12 horas (8:00 AM y 8:00 PM).\n• Ocluir el punto lagrimal suavemente por 1 minuto tras cada gota.',
        labOrders: [
          'Campimetría Computarizada (Campo Visual Humphrey 24-2)',
          'Tomografía de Coherencia Óptica (OCT) de Nervio Óptico y Células Ganglionares',
          'Paquimetría Corneal Ultrasónica',
        ],
      },
    ],
  },
};

export const MEDICAL_SPECIALTIES_LIST: MedicalSpecialtyConfig[] = Object.values(MEDICAL_SPECIALTIES_MAP);

export const MEDICAL_PROCEDURES_MASTER: MedicalProcedureDefinition[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. MEDICINA GENERAL & INTERNA (8 procedimientos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'med-gen-01',
    code: 'MG-01',
    specialtyId: 'med_general',
    name: 'Consulta de Medicina General & Evaluación Integral',
    categoryLabel: 'Consulta Médica',
    defaultPriceUSD: 35.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#0284c7',
    stages: [
      { id: 'mg01-s1', title: 'Anamnesis clínica, toma de signos vitales y antropometría', order: 1, sessionNumber: 1 },
      { id: 'mg01-s2', title: 'Examen físico segmentario, diagnóstico CIE-10 y emisión de récipe', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gen-02',
    code: 'MG-02',
    specialtyId: 'med_general',
    name: 'Electrocardiograma de Reposo de 12 Derivaciones (ECG) + Informe',
    categoryLabel: 'Cardiología & Diagnóstico',
    defaultPriceUSD: 45.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#0369a1',
    stages: [
      { id: 'mg02-s1', title: 'Colocación de electrodos precordiales y periféricos en reposo', order: 1, sessionNumber: 1 },
      { id: 'mg02-s2', title: 'Adquisición de trazado de 12 derivaciones e interpretación de ritmo/QTc', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gen-03',
    code: 'MG-03',
    specialtyId: 'med_general',
    name: 'Evaluación Cardiovascular Preoperatoria Integral (ASA / Goldman)',
    categoryLabel: 'Cardiología & Diagnóstico',
    defaultPriceUSD: 70.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    color: '#0284c7',
    stages: [
      { id: 'mg03-s1', title: 'Revisión de paraclínicos, radiografía de tórax y antecedentes anestésicos', order: 1, sessionNumber: 1 },
      { id: 'mg03-s2', title: 'Electrocardiograma de 12 derivaciones y auscultación cardiopulmonar', order: 2, sessionNumber: 1 },
      { id: 'mg03-s3', title: 'Estratificación de riesgo quirúrgico Goldman/ASA y emisión de aval', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gen-04',
    code: 'MG-04',
    specialtyId: 'med_general',
    name: 'Hidratación Parenteral Endovenosa + Medicación de Urgencia',
    categoryLabel: 'Urgencias Ambulatorias',
    defaultPriceUSD: 60.0,
    estimatedDurationMin: 60,
    sessionsRequired: 1,
    color: '#0ea5e9',
    stages: [
      { id: 'mg04-s1', title: 'Cateterización de vía periférica y administración de solución cristaloide', order: 1, sessionNumber: 1 },
      { id: 'mg04-s2', title: 'Infusión de medicación endovenosa (analgésico/antiemético/protector)', order: 2, sessionNumber: 1 },
      { id: 'mg04-s3', title: 'Reevaluación hemodinámica post-infusión y retiro de catéter', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gen-05',
    code: 'MG-05',
    specialtyId: 'med_general',
    name: 'Sutura de Herida Menor + Cura Quirúrgica Local',
    categoryLabel: 'Cirugía Menor Ambulatoria',
    defaultPriceUSD: 65.0,
    estimatedDurationMin: 40,
    sessionsRequired: 2,
    color: '#0284c7',
    stages: [
      { id: 'mg05-s1', title: 'Asepsia, anestesia infiltrativa con lidocaína y síntesis por planos (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'mg05-s2', title: 'Control de cicatrización y retiro de puntos de sutura (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-gen-06',
    code: 'MG-06',
    specialtyId: 'med_general',
    name: 'Lavado Ótico Bilateral por Tapón de Cerumen Impactado',
    categoryLabel: 'Procedimientos Menores',
    defaultPriceUSD: 40.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#38bdf8',
    stages: [
      { id: 'mg06-s1', title: 'Otoscopia diagnóstica e instilación de solución cerumenolítica tibia', order: 1, sessionNumber: 1 },
      { id: 'mg06-s2', title: 'Irrigación controlada y verificación de indemnidad timpánica', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gen-07',
    code: 'MG-07',
    specialtyId: 'med_general',
    name: 'Certificado Médico de Salud Integral / Aptitud Laboral',
    categoryLabel: 'Certificaciones',
    defaultPriceUSD: 30.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    color: '#0284c7',
    stages: [
      { id: 'mg07-s1', title: 'Examen físico general, agudeza visual básica y signos vitales', order: 1, sessionNumber: 1 },
      { id: 'mg07-s2', title: 'Emisión de certificado médico oficial firmado y sellado', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gen-08',
    code: 'MG-08',
    specialtyId: 'med_general',
    name: 'Chequeo Ejecutivo Preventivo Cardiometabólico (2 Sesiones)',
    categoryLabel: 'Medicina Preventiva',
    defaultPriceUSD: 110.0,
    estimatedDurationMin: 50,
    sessionsRequired: 2,
    color: '#0369a1',
    stages: [
      { id: 'mg08-s1', title: 'Evaluación inicial, bioimpedancia corporal, ECG y orden de perfil 20 (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'mg08-s2', title: 'Lectura de resultados de laboratorio y plan cardiometabólico anual (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. PEDIATRÍA & PUERICULTURA (8 procedimientos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'med-ped-01',
    code: 'PED-01',
    specialtyId: 'med_pediatria',
    name: 'Consulta de Control de Niño Sano & Crecimiento (Percentiles OMS)',
    categoryLabel: 'Puericultura & Crecimiento',
    defaultPriceUSD: 40.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#10b981',
    stages: [
      { id: 'ped01-s1', title: 'Antropometría pediátrica (peso, talla, perímetro cefálico) y percentiles OMS', order: 1, sessionNumber: 1 },
      { id: 'ped01-s2', title: 'Evaluación de hitos del desarrollo psicomotor y pauta nutricional/ablactación', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-02',
    code: 'PED-02',
    specialtyId: 'med_pediatria',
    name: 'Consulta de Urgencia Pediátrica (Fiebre / Infección Aguda)',
    categoryLabel: 'Urgencias Pediátricas',
    defaultPriceUSD: 45.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#059669',
    stages: [
      { id: 'ped02-s1', title: 'Triaje pediátrico (Triángulo de Evaluación Pediátrica) y oximetría de pulso', order: 1, sessionNumber: 1 },
      { id: 'ped02-s2', title: 'Otoscopia, orofaringoscopia, auscultación y cálculo ponderal de fármacos', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-03',
    code: 'PED-03',
    specialtyId: 'med_pediatria',
    name: 'Sesión de Nebulización Pediátrica / Terapia Inhalatoria con Oximetría',
    categoryLabel: 'Terapia Respiratoria',
    defaultPriceUSD: 25.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#34d399',
    stages: [
      { id: 'ped03-s1', title: 'Auscultación pulmonar basal y medición de SpO2 pre-broncodilatador', order: 1, sessionNumber: 1 },
      { id: 'ped03-s2', title: 'Micronebulización con broncodilatador/corticoide inhalado por 15 min', order: 2, sessionNumber: 1 },
      { id: 'ped03-s3', title: 'Reevaluación del Score de Bierman-Pierson / Wood-Downes y SpO2 final', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-04',
    code: 'PED-04',
    specialtyId: 'med_pediatria',
    name: 'Aplicación de Vacuna Hexavalente / Pentavalente Acelular + Registro PAI',
    categoryLabel: 'Inmunizaciones & Vacunas',
    defaultPriceUSD: 85.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    color: '#10b981',
    stages: [
      { id: 'ped04-s1', title: 'Verificación de cadena de frío, lote biológico y anamnesis pre-vacunal', order: 1, sessionNumber: 1 },
      { id: 'ped04-s2', title: 'Administración intramuscular, observación 15 min y sellado de tarjeta', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-05',
    code: 'PED-05',
    specialtyId: 'med_pediatria',
    name: 'Vacunación Antineumocócica Conjugada 13-Valente / Rotavirus',
    categoryLabel: 'Inmunizaciones & Vacunas',
    defaultPriceUSD: 95.0,
    estimatedDurationMin: 20,
    sessionsRequired: 1,
    color: '#059669',
    stages: [
      { id: 'ped05-s1', title: 'Revisión de esquema de inmunización según edad cronológica', order: 1, sessionNumber: 1 },
      { id: 'ped05-s2', title: 'Aplicación biológica, registro de lote y pauta de manejo post-vacunal', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-06',
    code: 'PED-06',
    specialtyId: 'med_pediatria',
    name: 'Evaluación del Recién Nacido & Asesoría de Lactancia Materna',
    categoryLabel: 'Neonatología Ambulatoria',
    defaultPriceUSD: 50.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    color: '#10b981',
    stages: [
      { id: 'ped06-s1', title: 'Examen físico neonatal completo, reflejos arcaicos, cordón umbilical e ictericia', order: 1, sessionNumber: 1 },
      { id: 'ped06-s2', title: 'Evaluación de acople al pecho, ganancia ponderal diaria y tamizaje neonatal', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-07',
    code: 'PED-07',
    specialtyId: 'med_pediatria',
    name: 'Certificado de Salud Escolar / Aptitud Deportiva Infantil',
    categoryLabel: 'Certificaciones Pediátricas',
    defaultPriceUSD: 30.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#34d399',
    stages: [
      { id: 'ped07-s1', title: 'Examen físico integral, despistaje visual/auditivo, postura y carnet vacunal', order: 1, sessionNumber: 1 },
      { id: 'ped07-s2', title: 'Emisión de informe médico oficial de ingreso escolar', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-ped-08',
    code: 'PED-08',
    specialtyId: 'med_pediatria',
    name: 'Programa Trimestral de Seguimiento del Lactante (3 Consultas)',
    categoryLabel: 'Paquetes de Puericultura',
    defaultPriceUSD: 105.0,
    estimatedDurationMin: 35,
    sessionsRequired: 3,
    color: '#047857',
    stages: [
      { id: 'ped08-s1', title: 'Control Mensual 1: Curva ponderal, perímetro cefálico y lactancia (Mes 1)', order: 1, sessionNumber: 1 },
      { id: 'ped08-s2', title: 'Control Mensual 2: Desarrollo motor e inmunizaciones (Mes 2)', order: 2, sessionNumber: 2 },
      { id: 'ped08-s3', title: 'Control Mensual 3: Introducción de alimentación complementaria (Mes 3)', order: 3, sessionNumber: 3 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. GINECOLOGÍA & OBSTETRICIA (8 procedimientos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'med-gin-01',
    code: 'GIN-01',
    specialtyId: 'med_ginecologia',
    name: 'Consulta Ginecológica Integral + Citología Cervical (Papanicolaou)',
    categoryLabel: 'Ginecología Preventiva',
    defaultPriceUSD: 55.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    color: '#ec4899',
    stages: [
      { id: 'gin01-s1', title: 'Anamnesis gineco-obstétrica, examen físico mamario y especuloscopia', order: 1, sessionNumber: 1 },
      { id: 'gin01-s2', title: 'Toma de muestra exo/endocervical para citología exfoliativa y fijación', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gin-02',
    code: 'GIN-02',
    specialtyId: 'med_ginecologia',
    name: 'Control Prenatal Obstétrico + Ecografía Fetal de Seguimiento',
    categoryLabel: 'Obstetricia & Control Prenatal',
    defaultPriceUSD: 65.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    color: '#db2777',
    stages: [
      { id: 'gin02-s1', title: 'Cálculo de edad gestacional, control de PA, peso materno y altura uterina', order: 1, sessionNumber: 1 },
      { id: 'gin02-s2', title: 'Biometría fetal ultrasónica, frecuencia cardíaca fetal (FCF) y líquido amniótico', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gin-03',
    code: 'GIN-03',
    specialtyId: 'med_ginecologia',
    name: 'Colposcopia Digital Ampliada (Test de ácido acético y Schiller)',
    categoryLabel: 'Patología Cervical',
    defaultPriceUSD: 75.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#be185d',
    stages: [
      { id: 'gin03-s1', title: 'Visualización colposcópica de zona de transformación con ácido acético al 5%', order: 1, sessionNumber: 1 },
      { id: 'gin03-s2', title: 'Prueba de Schiller con Lugol y captura fotográfica para informe colposcópico', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gin-04',
    code: 'GIN-04',
    specialtyId: 'med_ginecologia',
    name: 'Ecografía Pélvica Transvaginal o Abdominal de Alta Resolución',
    categoryLabel: 'Ecografía Ginecológica',
    defaultPriceUSD: 50.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#ec4899',
    stages: [
      { id: 'gin04-s1', title: 'Evaluación ecográfica de útero, línea endometrial y fondo de saco de Douglas', order: 1, sessionNumber: 1 },
      { id: 'gin04-s2', title: 'Morfometría ovárica bilateral, conteo folicular y emisión de reporte', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gin-05',
    code: 'GIN-05',
    specialtyId: 'med_ginecologia',
    name: 'Inserción de Dispositivo Intrauterino (DIU T de Cobre / Hormonal)',
    categoryLabel: 'Planificación Familiar',
    defaultPriceUSD: 140.0,
    estimatedDurationMin: 45,
    sessionsRequired: 2,
    color: '#db2777',
    stages: [
      { id: 'gin05-s1', title: 'Histerometría, inserción aséptica del DIU y comprobación ecográfica (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'gin05-s2', title: 'Control ecográfico post-menstrual de ubicación intrauterina a los 30 días (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-gin-06',
    code: 'GIN-06',
    specialtyId: 'med_ginecologia',
    name: 'Colocación o Retiro de Implante Subdérmico Anticonceptivo',
    categoryLabel: 'Planificación Familiar',
    defaultPriceUSD: 130.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#f472b6',
    stages: [
      { id: 'gin06-s1', title: 'Asepsia de cara interna del brazo y anestesia local con lidocaína', order: 1, sessionNumber: 1 },
      { id: 'gin06-s2', title: 'Inserción/extracción subdérmica con aplicador estéril y vendaje compresivo', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-gin-07',
    code: 'GIN-07',
    specialtyId: 'med_ginecologia',
    name: 'Biopsia Dirigida de Cuello Uterino / Endometrio (sin anatomía patológica)',
    categoryLabel: 'Patología Cervical',
    defaultPriceUSD: 95.0,
    estimatedDurationMin: 40,
    sessionsRequired: 2,
    color: '#9d174d',
    stages: [
      { id: 'gin07-s1', title: 'Toma de muestra dirigida bajo visión colposcópica y hemostasia con Monsel (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'gin07-s2', title: 'Revisión del resultado histopatológico y definición de conducta (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-gin-08',
    code: 'GIN-08',
    specialtyId: 'med_ginecologia',
    name: 'Paquete Trimestral de Control Prenatal (3 Consultas + Ecografías)',
    categoryLabel: 'Obstetricia & Control Prenatal',
    defaultPriceUSD: 175.0,
    estimatedDurationMin: 40,
    sessionsRequired: 3,
    color: '#be185d',
    stages: [
      { id: 'gin08-s1', title: 'Control Obstétrico 1 + Ecografía y revisión de laboratorios prenatales (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'gin08-s2', title: 'Control Obstétrico 2 + Curva de peso materno-fetal y Doppler básico (Cita 2)', order: 2, sessionNumber: 2 },
      { id: 'gin08-s3', title: 'Control Obstétrico 3 + Evaluación de bienestar fetal trimestral (Cita 3)', order: 3, sessionNumber: 3 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. DERMATOLOGÍA CLÍNICA & QUIRÚRGICA (8 procedimientos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'med-der-01',
    code: 'DER-01',
    specialtyId: 'med_dermatologia',
    name: 'Consulta Dermatológica + Dermatoscopia Digital de Luz Polarizada',
    categoryLabel: 'Dermatología Clínica',
    defaultPriceUSD: 45.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#8b5cf6',
    stages: [
      { id: 'der01-s1', title: 'Evaluación cutánea completa, cabello y anexos ungueales', order: 1, sessionNumber: 1 },
      { id: 'der01-s2', title: 'Examen dermatoscópico de lesiones pigmentadas (regla ABCDE) y plan tópico/oral', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-der-02',
    code: 'DER-02',
    specialtyId: 'med_dermatologia',
    name: 'Crioterapia con Nitrógeno Líquido (Verrugas / Queratosis — hasta 5 lesiones)',
    categoryLabel: 'Cirugía Dermatológica',
    defaultPriceUSD: 60.0,
    estimatedDurationMin: 25,
    sessionsRequired: 2,
    color: '#7c3aed',
    stages: [
      { id: 'der02-s1', title: 'Aplicación controlada de ciclos de congelación con nitrógeno líquido (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'der02-s2', title: 'Control a los 15 días y sesión de retoque si persiste base queratósica (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-der-03',
    code: 'DER-03',
    specialtyId: 'med_dermatologia',
    name: 'Biopsia de Piel por Punch o Shave + Control de Sutura',
    categoryLabel: 'Cirugía Dermatológica',
    defaultPriceUSD: 85.0,
    estimatedDurationMin: 35,
    sessionsRequired: 2,
    color: '#6d28d9',
    stages: [
      { id: 'der03-s1', title: 'Anestesia local, toma de cilindro cutáneo con Punch, sutura y fijación en formol (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'der03-s2', title: 'Retiro de puntos y entrega/explicación de diagnóstico histopatológico (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-der-04',
    code: 'DER-04',
    specialtyId: 'med_dermatologia',
    name: 'Electrocauterización / Radiofrecuencia de Fibromas y Queratosis Seborreicas',
    categoryLabel: 'Cirugía Dermatológica',
    defaultPriceUSD: 75.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    color: '#8b5cf6',
    stages: [
      { id: 'der04-s1', title: 'Aplicación de anestesia tópica/infiltrativa y asepsia con clorhexidina', order: 1, sessionNumber: 1 },
      { id: 'der04-s2', title: 'Electrodesecación de lesiones benignas, hemostasia y cura tópica', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-der-05',
    code: 'DER-05',
    specialtyId: 'med_dermatologia',
    name: 'Infiltración Intralesional con Acetónido de Triamcinolona (Queloides / Alopecia)',
    categoryLabel: 'Terapia Intralesional',
    defaultPriceUSD: 55.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#a78bfa',
    stages: [
      { id: 'der05-s1', title: 'Marcaje de placas de alopecia areata o cicatriz queloide', order: 1, sessionNumber: 1 },
      { id: 'der05-s2', title: 'Microinfiltración intradérmica de corticoide de depósito diluido', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-der-06',
    code: 'DER-06',
    specialtyId: 'med_dermatologia',
    name: 'Peeling Químico Médico Despigmentante / Anti-Acné',
    categoryLabel: 'Dermoestética Médica',
    defaultPriceUSD: 80.0,
    estimatedDurationMin: 45,
    sessionsRequired: 1,
    color: '#9333ea',
    stages: [
      { id: 'der06-s1', title: 'Desengrase cutáneo, protección de áreas sensibles y aplicación del ácido médico', order: 1, sessionNumber: 1 },
      { id: 'der06-s2', title: 'Neutralización química, máscara descongestiva y sellado fotoprotector', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-der-07',
    code: 'DER-07',
    specialtyId: 'med_dermatologia',
    name: 'Aplicación de Toxina Botulínica Terapéutica/Estética + Retoque a los 14 días',
    categoryLabel: 'Dermoestética Médica',
    defaultPriceUSD: 240.0,
    estimatedDurationMin: 40,
    sessionsRequired: 2,
    color: '#7c3aed',
    stages: [
      { id: 'der07-s1', title: 'Mapeo dinámico muscular facial/axilar y aplicación de unidades de toxina (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'der07-s2', title: 'Evaluación fotográfica a los 14 días y retoque de simetría si amerita (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-der-08',
    code: 'DER-08',
    specialtyId: 'med_dermatologia',
    name: 'Exéresis Quirúrgica de Quiste Epidérmico / Lipoma Subcutáneo Menor',
    categoryLabel: 'Cirugía Dermatológica',
    defaultPriceUSD: 120.0,
    estimatedDurationMin: 50,
    sessionsRequired: 2,
    color: '#5b21b6',
    stages: [
      { id: 'der08-s1', title: 'Incisión en huso, disección completa de la cápsula quística y cierre por planos (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'der08-s2', title: 'Cura quirúrgica y retiro de sutura a los 10-14 días (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. TRAUMATOLOGÍA, ORTOPEDIA & REHABILITACIÓN (8 procedimientos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'med-tra-01',
    code: 'TRA-01',
    specialtyId: 'med_traumatologia',
    name: 'Consulta de Traumatología y Ortopedia + Evaluación Biomecánica',
    categoryLabel: 'Consulta Ortopédica',
    defaultPriceUSD: 45.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#f59e0b',
    stages: [
      { id: 'tra01-s1', title: 'Examen articular, goniometría, maniobras ortopédicas específicas y fuerza muscular', order: 1, sessionNumber: 1 },
      { id: 'tra01-s2', title: 'Lectura de estudios radiológicos/RMN y plan quirúrgico o conservador', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-tra-02',
    code: 'TRA-02',
    specialtyId: 'med_traumatologia',
    name: 'Infiltración Intraarticular / Peritendinosa (Corticoide + Anestésico)',
    categoryLabel: 'Intervencionismo Articular',
    defaultPriceUSD: 75.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#d97706',
    stages: [
      { id: 'tra02-s1', title: 'Localización anatómica del portal articular y técnica rigurosa de asepsia', order: 1, sessionNumber: 1 },
      { id: 'tra02-s2', title: 'Punción e infiltración intraarticular de depósito y movilización pasiva suave', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-tra-03',
    code: 'TRA-03',
    specialtyId: 'med_traumatologia',
    name: 'Viscosuplementación de Rodilla con Ácido Hialurónico de Alto Peso Molecular',
    categoryLabel: 'Intervencionismo Articular',
    defaultPriceUSD: 160.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#b45309',
    stages: [
      { id: 'tra03-s1', title: 'Preparación aséptica de rodilla y artrocentesis evacuadora si hay derrame', order: 1, sessionNumber: 1 },
      { id: 'tra03-s2', title: 'Inyección intraarticular de ácido hialurónico reticulado y reposo articular', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-tra-04',
    code: 'TRA-04',
    specialtyId: 'med_traumatologia',
    name: 'Inmovilización con Férula de Yeso o Fibra de Vidrio (Miembro Superior/Inferior)',
    categoryLabel: 'Fracturas & Inmovilización',
    defaultPriceUSD: 85.0,
    estimatedDurationMin: 45,
    sessionsRequired: 2,
    color: '#f59e0b',
    stages: [
      { id: 'tra04-s1', title: 'Alineación funcional, colocación de estoquinete/guata y moldeado de fibra/yeso (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'tra04-s2', title: 'Control neurovascular distal y retiro con sierra oscilante al consolidar (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-tra-05',
    code: 'TRA-05',
    specialtyId: 'med_traumatologia',
    name: 'Artrocentesis Evacuadora de Rodilla / Drenaje de Hemartrosis o Sinovitis',
    categoryLabel: 'Intervencionismo Articular',
    defaultPriceUSD: 70.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#d97706',
    stages: [
      { id: 'tra05-s1', title: 'Anestesia local por planos y punción del receso suprapatelar', order: 1, sessionNumber: 1 },
      { id: 'tra05-s2', title: 'Evacuación de líquido sinovial a tensión y vendaje compresivo elástico', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-tra-06',
    code: 'TRA-06',
    specialtyId: 'med_traumatologia',
    name: 'Vendaje Neuromuscular Funcional (Kinesiotaping / Vendaje de Tobillo)',
    categoryLabel: 'Medicina Deportiva',
    defaultPriceUSD: 35.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#fbbf24',
    stages: [
      { id: 'tra06-s1', title: 'Evaluación de estabilidad ligamentaria y preparación de la piel', order: 1, sessionNumber: 1 },
      { id: 'tra06-s2', title: 'Colocación de vendaje funcional estabilizador con tensión calibrada', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-tra-07',
    code: 'TRA-07',
    specialtyId: 'med_traumatologia',
    name: 'Paquete de Rehabilitación Física & Fisioterapia (5 Sesiones)',
    categoryLabel: 'Rehabilitación Multisesión',
    defaultPriceUSD: 150.0,
    estimatedDurationMin: 50,
    sessionsRequired: 5,
    color: '#b45309',
    stages: [
      { id: 'tra07-s1', title: 'Sesión 1: Evaluación fisiátrica, TENS analgésico y termoterapia/crioterapia', order: 1, sessionNumber: 1 },
      { id: 'tra07-s2', title: 'Sesión 2: Ultrasonido terapéutico, terapia manual y liberación miofascial', order: 2, sessionNumber: 2 },
      { id: 'tra07-s3', title: 'Sesión 3: Movilización articular progresiva y estiramientos asistidos', order: 3, sessionNumber: 3 },
      { id: 'tra07-s4', title: 'Sesión 4: Fortalecimiento isométrico e isotónico con bandas de resistencia', order: 4, sessionNumber: 4 },
      { id: 'tra07-s5', title: 'Sesión 5: Reeducación propioceptiva y alta funcional con plan domiciliario', order: 5, sessionNumber: 5 },
    ],
  },
  {
    id: 'med-tra-08',
    code: 'TRA-08',
    specialtyId: 'med_traumatologia',
    name: 'Reducción Cerrada de Luxación / Fractura Desplazada Menor + Inmovilización',
    categoryLabel: 'Fracturas & Inmovilización',
    defaultPriceUSD: 145.0,
    estimatedDurationMin: 50,
    sessionsRequired: 2,
    color: '#92400e',
    stages: [
      { id: 'tra08-s1', title: 'Bloqueo anestésico local/regional, maniobra de reducción cerrada y férula (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'tra08-s2', title: 'Control radiográfico post-reducción y seguimiento de consolidación (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. OFTALMOLOGÍA & OPTOMETRÍA CLÍNICA (8 procedimientos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'med-oft-01',
    code: 'OFT-01',
    specialtyId: 'med_oftalmologia',
    name: 'Consulta Oftalmológica Integral (Agudeza Visual, Lámpara de Hendidura y PIO)',
    categoryLabel: 'Consulta Oftalmológica',
    defaultPriceUSD: 50.0,
    estimatedDurationMin: 35,
    sessionsRequired: 1,
    color: '#06b6d4',
    stages: [
      { id: 'oft01-s1', title: 'Medición de agudeza visual Snellen (lejos/cerca) y autorrefracción computarizada', order: 1, sessionNumber: 1 },
      { id: 'oft01-s2', title: 'Biomicroscopía de segmento anterior en lámpara de hendidura y tonometría', order: 2, sessionNumber: 1 },
      { id: 'oft01-s3', title: 'Oftalmoscopia de fondo de ojo y prescripción médica', order: 3, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-oft-02',
    code: 'OFT-02',
    specialtyId: 'med_oftalmologia',
    name: 'Refracción Computarizada + Subjetiva y Fórmula de Lentes Correctivos',
    categoryLabel: 'Optometría & Refracción',
    defaultPriceUSD: 35.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#0891b2',
    stages: [
      { id: 'oft02-s1', title: 'Queratometría, autorrefracción objetiva y medición de distancia interpupilar (DIP)', order: 1, sessionNumber: 1 },
      { id: 'oft02-s2', title: 'Prueba subjetiva en foróptero/montura de prueba y emisión de fórmula óptica', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-oft-03',
    code: 'OFT-03',
    specialtyId: 'med_oftalmologia',
    name: 'Tonometría de Aplanación de Goldmann + Gonioscopia (Despistaje de Glaucoma)',
    categoryLabel: 'Glaucoma & Segmento Anterior',
    defaultPriceUSD: 45.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#0e7490',
    stages: [
      { id: 'oft03-s1', title: 'Instilación de anestésico tópico con fluoresceína y toma de PIO bilateral', order: 1, sessionNumber: 1 },
      { id: 'oft03-s2', title: 'Evaluación del ángulo camerular y excavación papilar (relación C/D)', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-oft-04',
    code: 'OFT-04',
    specialtyId: 'med_oftalmologia',
    name: 'Fondo de Ojo bajo Dilatación Pupilar (Retinopatía Diabética / Hipertensiva)',
    categoryLabel: 'Retina & Vítreo',
    defaultPriceUSD: 55.0,
    estimatedDurationMin: 40,
    sessionsRequired: 1,
    color: '#06b6d4',
    stages: [
      { id: 'oft04-s1', title: 'Midriasis farmacológica con tropicamida/fenilefrina (espera 20 min)', order: 1, sessionNumber: 1 },
      { id: 'oft04-s2', title: 'Oftalmoscopia indirecta de polo posterior, mácula, vasos y periferia retiniana', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-oft-05',
    code: 'OFT-05',
    specialtyId: 'med_oftalmologia',
    name: 'Extracción de Cuerpo Extraño Corneal / Conjuntival en Lámpara de Hendidura',
    categoryLabel: 'Urgencias Oftalmológicas',
    defaultPriceUSD: 75.0,
    estimatedDurationMin: 30,
    sessionsRequired: 2,
    color: '#0891b2',
    stages: [
      { id: 'oft05-s1', title: 'Anestesia tópica, extracción de partícula y fresado de anillo de óxido corneal (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'oft05-s2', title: 'Control con tinción de fluoresceína a las 48h para verificar epitelización (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-oft-06',
    code: 'OFT-06',
    specialtyId: 'med_oftalmologia',
    name: 'Evaluación de Superficie Ocular (Test de Schirmer + Tinción Fluoresceína / BUT)',
    categoryLabel: 'Superficie Ocular & Ojo Seco',
    defaultPriceUSD: 40.0,
    estimatedDurationMin: 25,
    sessionsRequired: 1,
    color: '#22d3ee',
    stages: [
      { id: 'oft06-s1', title: 'Colocación de tiras milimetradas de Schirmer por 5 minutos para volumen lagrimal', order: 1, sessionNumber: 1 },
      { id: 'oft06-s2', title: 'Medición del tiempo de ruptura lagrimal (BUT) con filtro azul cobalto', order: 2, sessionNumber: 1 },
    ],
  },
  {
    id: 'med-oft-07',
    code: 'OFT-07',
    specialtyId: 'med_oftalmologia',
    name: 'Drenaje Quirúrgico / Curetaje de Chalazión Palpebral',
    categoryLabel: 'Cirugía Palpebral Menor',
    defaultPriceUSD: 110.0,
    estimatedDurationMin: 40,
    sessionsRequired: 2,
    color: '#155e75',
    stages: [
      { id: 'oft07-s1', title: 'Anestesia palpebral, colocación de pinza de chalazión, incisión tarsal y curetaje (Cita 1)', order: 1, sessionNumber: 1 },
      { id: 'oft07-s2', title: 'Control post-operatorio a los 7 días (Cita 2)', order: 2, sessionNumber: 2 },
    ],
  },
  {
    id: 'med-oft-08',
    code: 'OFT-08',
    specialtyId: 'med_oftalmologia',
    name: 'Sondeo e Irrigación de Vías Lagrimales',
    categoryLabel: 'Cirugía Palpebral Menor',
    defaultPriceUSD: 70.0,
    estimatedDurationMin: 30,
    sessionsRequired: 1,
    color: '#0891b2',
    stages: [
      { id: 'oft08-s1', title: 'Dilatación del punto lagrimal bajo anestesia tópica', order: 1, sessionNumber: 1 },
      { id: 'oft08-s2', title: 'Irrigación de canalículos y conducto nasolagrimal con solución salina estéril', order: 2, sessionNumber: 1 },
    ],
  },
];

/**
 * Combina el catálogo maestro de procedimientos médicos con los servicios registrados
 * en el inventario/catálogo de la empresa (`items`), permitiendo precios personalizados
 * por clínica y filtrado opcional por especialidad médica.
 */
export function mergeTenantMedicalServices(
  tenantItems: Array<{ id: string; name: string; base_price?: number; type?: string; metadata?: any }>,
  specialtyFilter?: MedicalSpecialtyId
): MedicalProcedureDefinition[] {
  const customProcedures: MedicalProcedureDefinition[] = [];

  // 1. Procesar servicios personalizados o sobrescritos por el tenant
  for (const item of tenantItems || []) {
    if (item.type === 'service') {
      const existingMatch = MEDICAL_PROCEDURES_MASTER.find(
        (p) => p.name.toLowerCase() === item.name.toLowerCase()
      );

      if (existingMatch) {
        customProcedures.push({
          ...existingMatch,
          id: item.id,
          defaultPriceUSD: Number(item.base_price ?? existingMatch.defaultPriceUSD),
        });
      } else {
        const itemSpec = (item.metadata?.specialty_id ||
          item.metadata?.specialtyId ||
          specialtyFilter ||
          'med_general') as MedicalSpecialtyId;

        const specConfig = MEDICAL_SPECIALTIES_MAP[itemSpec] || MEDICAL_SPECIALTIES_MAP.med_general;

        customProcedures.push({
          id: item.id,
          code: `MED-${item.id.slice(0, 4).toUpperCase()}`,
          specialtyId: specConfig.id,
          name: item.name,
          categoryLabel: item.metadata?.category_label || specConfig.shortName,
          defaultPriceUSD: Number(item.base_price ?? 45),
          estimatedDurationMin: Number(item.metadata?.duration_minutes ?? 30),
          sessionsRequired: Number(item.metadata?.sessions_required ?? 1),
          color: specConfig.color,
          stages: Array.isArray(item.metadata?.stages) && item.metadata.stages.length > 0
            ? item.metadata.stages
            : [
                {
                  id: `stg-med-custom-1`,
                  title: `Ejecución clínica de ${item.name}`,
                  order: 1,
                  sessionNumber: 1,
                },
              ],
        });
      }
    }
  }

  // 2. Añadir los procedimientos maestros que no hayan sido sobrescritos por nombre
  for (const master of MEDICAL_PROCEDURES_MASTER) {
    const alreadyIncluded = customProcedures.some(
      (p) => p.name.toLowerCase() === master.name.toLowerCase()
    );
    if (!alreadyIncluded) {
      customProcedures.push(master);
    }
  }

  if (specialtyFilter) {
    return customProcedures.filter((p) => p.specialtyId === specialtyFilter);
  }

  return customProcedures;
}
