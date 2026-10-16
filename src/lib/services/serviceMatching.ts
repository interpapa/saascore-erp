/**
 * SaaSCore ERP - Motor Inteligente de Vinculación y Detección de Especialistas
 * 
 * Permite que los colaboradores, médicos y especialistas coincidan automáticamente
 * con las ramas de atención y servicios del catálogo (ej. 'Cardiología' <-> 'Cardiólogo',
 * 'Odontología' <-> 'Odontólogo', 'Pediatría' <-> 'Pediatra', etc.), eliminando el error
 * de "no hay profesional disponible / persona encargada".
 */

export function normalizeServiceText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Comprueba de manera robusta y semántica si un colaborador o doctor coincide con un servicio o rama.
 */
export function matchesEmployeeService(emp: any, serviceName: string): boolean {
  if (!emp || !serviceName) return false;
  const target = normalizeServiceText(serviceName);
  if (!target) return false;

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

  // 3. Especialidades y cargos de módulos especializados (Médico, Odontólogo, Barbero, Groomer)
  const candidates: Array<string | undefined> = [
    emp.metadata?.specialty,
    emp.metadata?.doctor_config?.specialty,
    emp.metadata?.doctor_config?.role,
    emp.metadata?.dentist_config?.specialty,
    emp.metadata?.dentist_config?.role,
    emp.metadata?.barber_config?.specialty,
    emp.metadata?.barber_config?.role,
    emp.metadata?.groomer_config?.specialty,
    emp.metadata?.groomer_config?.role,
    emp.metadata?.role_title,
    emp.metadata?.role,
    emp.role,
    emp.name, // por si el servicio incluye el nombre directo del profesional
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cand = normalizeServiceText(raw);
    if (!cand) continue;

    // Coincidencia exacta o por subcadena
    if (cand === target || (cand.length > 3 && target.includes(cand)) || (target.length > 3 && cand.includes(target))) {
      return true;
    }

    // Raíz morfológica común médica y profesional
    const medicalStems = [
      'cardiolog', // Cardiología, Cardiólogo, Cardiológico
      'odontolog', // Odontología, Odontólogo
      'ginecolog', // Ginecología, Ginecólogo
      'pediatr',   // Pediatría, Pediatra
      'dermatolog',// Dermatología, Dermatólogo
      'traumatolog', // Traumatología, Traumatólogo
      'oftalmolog', // Oftalmología, Oftalmólogo
      'fisioterapi', // Fisioterapia, Fisioterapeuta
      'nutricion', // Nutrición, Nutricionista
      'psicolog',  // Psicología, Psicólogo
      'cirujan',   // Cirujano, Cirugía
      'barber',    // Barbería, Barbero
      'groom',     // Grooming, Groomer
      'estetic'    // Estética, Esteticista
    ];

    for (const stem of medicalStems) {
      if (cand.includes(stem) && target.includes(stem)) {
        return true;
      }
    }
  }

  // 4. Si el colaborador tiene habilitado el servicio general y no tiene particulares excluyentes
  const isGeneralEnabled = emp.metadata?.general_service_enabled !== false;
  if (isGeneralEnabled && (!svcs || svcs.length === 0)) {
    // Si el servicio es genérico ("consulta", "atención", "evaluación")
    if (target.includes('consulta') || target.includes('general') || target.includes('cita') || target.includes('atencion')) {
      return true;
    }
  }

  return false;
}
