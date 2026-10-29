/**
 * SaaSCore ERP - Motor Inteligente de Vinculación y Detección de Especialistas
 * 
 * Permite que los colaboradores, médicos y especialistas coincidan automáticamente
 * con las ramas de atención y servicios del catálogo (ej. 'Cardiología' <-> 'Cardiólogo',
 * 'Ginecología' <-> 'Ginecólogo', 'Odontología' <-> 'Odontólogo', etc.),
 * garantizando un blindaje estricto contra contaminaciones cruzadas (un cardiólogo
 * nunca será asignado a una cita de ginecología ni viceversa).
 */

export type ClinicalDomain = 
  | 'cardiologia'
  | 'ginecologia'
  | 'odontologia'
  | 'pediatria'
  | 'dermatologia'
  | 'traumatologia'
  | 'oftalmologia'
  | 'barberia'
  | 'grooming'
  | 'med_general';

export const DOMAIN_KEYWORDS: Record<ClinicalDomain, string[]> = {
  cardiologia: [
    'cardiolog', 'cardio', 'corazon', 'electrocardiograma', 'ecg', 'holter', 'mapa', 'ecocardiograma', 'presion arterial', 'tension', 'hipertension'
  ],
  ginecologia: [
    'ginecolog', 'gineco', 'ginelco', 'obstetr', 'prenatal', 'embarazo', 'parto', 'cesarea', 
    'colposcop', 'citolog', 'papanicolau', 'diu', 'eco pelvico', 'eco transvaginal', 'feto', 'fetal', 'puerperio'
  ],
  odontologia: [
    'odontolog', 'dentis', 'dient', 'muela', 'ortodonc', 'endodonc', 'periodonc', 
    'bracket', 'profilaxis', 'caries', 'extraccion dental', 'implante dental', 'odontopediatr'
  ],
  pediatria: [
    'pediatr', 'nino', 'infantil', 'puericultur', 'vacunacion infantil', 'lactante'
  ],
  dermatologia: [
    'dermatolog', 'cutane', 'piel', 'melanom', 'acne', 'lunar', 'biopsia cutanea'
  ],
  traumatologia: [
    'traumatolog', 'ortoped', 'hueso', 'fractur', 'fisioterapi', 'rehabilitac', 'articulac', 'goniometr'
  ],
  oftalmologia: [
    'oftalmolog', 'optometr', 'ojo', 'vision', 'refracc', 'lente', 'agudeza visual', 'fondo de ojo', 'tonometr'
  ],
  barberia: [
    'barber', 'fade', 'barba', 'degradado', 'afeitado', 'corte masculino'
  ],
  grooming: [
    'groom', 'canin', 'mascot', 'perro', 'gato', 'bano canino', 'corte a tijera'
  ],
  med_general: [
    'medicina general', 'medico general', 'medico internista', 'medicina interna', 'chequeo general'
  ]
};

export function normalizeServiceText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta el dominio clínico o profesional preponderante de un texto.
 */
export function detectClinicalDomain(text?: string | null): ClinicalDomain | null {
  if (!text) return null;
  const norm = normalizeServiceText(text);
  if (!norm) return null;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => norm.includes(kw))) {
      return domain as ClinicalDomain;
    }
  }
  return null;
}

/**
 * Obtiene el dominio clínico primario o exclusivo de un empleado a partir de su cargo, rol o especialidad.
 */
export function getEmployeePrimaryDomain(emp: any): ClinicalDomain | null {
  if (!emp) return null;

  // 1. Cargo / Profesión explícita (role_title o role)
  const primaryTitle = emp.metadata?.role_title || emp.role;
  const primaryDomain = detectClinicalDomain(primaryTitle);
  if (primaryDomain) return primaryDomain;

  // 2. Módulos marcados
  if (emp.metadata?.is_dentist || emp.metadata?.dentist_config?.is_active) return 'odontologia';
  if (emp.metadata?.is_barber || emp.metadata?.barber_config?.is_active) return 'barberia';
  if (emp.metadata?.is_groomer || emp.metadata?.groomer_config?.is_active) return 'grooming';

  // 3. Configuración de médico
  const docRole = emp.metadata?.doctor_config?.role;
  const docRoleDomain = detectClinicalDomain(docRole);
  if (docRoleDomain) return docRoleDomain;

  const docSpec = emp.metadata?.doctor_config?.specialty || emp.metadata?.specialty;
  const docSpecDomain = detectClinicalDomain(docSpec);
  if (docSpecDomain) return docSpecDomain;

  return null;
}

/**
 * Comprueba de manera robusta y semántica si un colaborador o doctor coincide con un servicio o rama.
 * Incluye protección estricta anti-contaminación cruzada entre especialidades disjuntas.
 */
export function matchesEmployeeService(emp: any, serviceName: string): boolean {
  if (!emp || !serviceName) return false;
  const target = normalizeServiceText(serviceName);
  if (!target) return false;

  const targetDomain = detectClinicalDomain(target);
  const employeeDomain = getEmployeePrimaryDomain(emp);

  // 🛡️ REGLA DE AISLAMIENTO Y EXCLUSIÓN DE ESPECIALIDAD:
  // Si el servicio pertenece a un dominio médico/profesional específico (ej: ginecología o cardiología)
  // y el colaborador tiene un dominio primario distinto e incompatible (ej: cardiólogo vs ginecología),
  // queda ESTRICTAMENTE EXCLUIDO.
  if (targetDomain && employeeDomain && targetDomain !== employeeDomain) {
    // Si ninguno de los dos es medicina general, no pueden cruzarse
    if (targetDomain !== 'med_general' && employeeDomain !== 'med_general') {
      return false;
    }
  }

  // 1. Servicios particulares explícitos en metadata.services
  const svcs = (emp.metadata?.services || []) as Array<{ name?: string }>;
  if (Array.isArray(svcs) && svcs.some(s => {
    const sNorm = normalizeServiceText(s.name);
    return sNorm === target || (sNorm.length > 3 && target.includes(sNorm)) || (target.length > 3 && sNorm.includes(target));
  })) {
    return true;
  }

  // 2. Nombre del servicio general configurado
  const generalName = normalizeServiceText(emp.metadata?.general_service_name);
  if (generalName && (generalName === target || (generalName.length > 3 && target.includes(generalName)) || (target.length > 3 && generalName.includes(target)))) {
    return true;
  }

  // 3. Especialidades y cargos de módulos especializados
  // Sanitización de residuos: si el empleado es cardiólogo primario pero tiene residuo de ginecología (o viceversa), ignorar el residuo
  const docSpecialty = emp.metadata?.doctor_config?.specialty;
  const isContaminatedResidue = 
    employeeDomain && 
    docSpecialty && 
    detectClinicalDomain(docSpecialty) !== null && 
    detectClinicalDomain(docSpecialty) !== employeeDomain;

  const cleanDocSpecialty = isContaminatedResidue ? undefined : docSpecialty;

  const candidates: Array<string | undefined> = [
    emp.metadata?.role_title,
    emp.metadata?.role,
    emp.role,
    emp.metadata?.doctor_config?.role,
    cleanDocSpecialty,
    emp.metadata?.specialty,
    emp.metadata?.dentist_config?.specialty,
    emp.metadata?.dentist_config?.role,
    emp.metadata?.barber_config?.specialty,
    emp.metadata?.barber_config?.role,
    emp.metadata?.groomer_config?.specialty,
    emp.metadata?.groomer_config?.role,
    emp.name,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cand = normalizeServiceText(raw);
    if (!cand) continue;

    // Coincidencia exacta o por subcadena
    if (cand === target || (cand.length > 3 && target.includes(cand)) || (target.length > 3 && cand.includes(target))) {
      return true;
    }

    // Si ambos coinciden en el mismo dominio clínico
    const candDomain = detectClinicalDomain(cand);
    if (candDomain && targetDomain && candDomain === targetDomain) {
      return true;
    }
  }

  // 4. Si el colaborador tiene habilitado el servicio general y no tiene particulares excluyentes
  const isGeneralEnabled = emp.metadata?.general_service_enabled !== false;
  if (isGeneralEnabled && (!svcs || svcs.length === 0)) {
    // Si el servicio es genérico ("consulta general", "atención médica", "evaluación") y el servicio NO tiene dominio excluyente
    if (!targetDomain || targetDomain === 'med_general') {
      if (target.includes('consulta') || target.includes('general') || target.includes('cita') || target.includes('atencion')) {
        return true;
      }
    }
  }

  return false;
}
