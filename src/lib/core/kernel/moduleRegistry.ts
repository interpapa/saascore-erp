/**
 * Rendo Kernel - Module Registry & Dependency Engine (Estilo Odoo 17)
 * 
 * Centraliza la definición de todos los módulos del ERP, sus dependencias,
 * categorías y validación de activación por tenant en tiempo de ejecución.
 */

export type ModuleId = 
  | 'caja' 
  | 'clientes' 
  | 'inventario'
  | 'catalogo' 
  | 'compras' 
  | 'contabilidad' 
  | 'calendario' 
  | 'whatsapp' 
  | 'kanban' 
  | 'equipo' 
  | 'franquicias' 
  | 'integraciones' 
  | 'estadisticas'
  | 'odontologia'
  | 'ginecologia'
  | 'cardiologia'
  | 'pediatria'
  | 'dermatologia'
  | 'traumatologia'
  | 'oftalmologia'
  | 'clinica'
  | 'med_general'
  | 'med_cardiologia'
  | 'med_pediatria'
  | 'med_ginecologia'
  | 'med_dermatologia'
  | 'med_traumatologia'
  | 'med_oftalmologia'
  | 'barberia'
  | 'grooming'
  | 'suscripciones'
  | 'produccion'
  | 'config' 
  | 'admin';

export const MEDICAL_SPECIALTY_MODULE_IDS: ModuleId[] = [
  'med_general',
  'cardiologia',
  'med_cardiologia',
  'ginecologia',
  'med_ginecologia',
  'pediatria',
  'med_pediatria',
  'dermatologia',
  'med_dermatologia',
  'traumatologia',
  'med_traumatologia',
  'oftalmologia',
  'med_oftalmologia',
];

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  category: 'comercial' | 'operaciones' | 'finanzas' | 'administracion';
  description: string;
  isCore?: boolean;
  dependencies?: ModuleId[];
}

export const MODULE_CATALOG: Record<ModuleId, ModuleDefinition> = {
  config: {
    id: 'config',
    name: 'Ajustes del Sistema',
    category: 'administracion',
    description: 'Parámetros generales de la empresa, divisas y logotipo.',
    isCore: true,
  },
  admin: {
    id: 'admin',
    name: 'Rendo Hub',
    category: 'administracion',
    description: 'Consola global de administración del software SaaS.',
    isCore: false,
  },
  clientes: {
    id: 'clientes',
    name: 'Directorio CRM',
    category: 'comercial',
    description: 'Fichas maestras de clientes, historial de compras y contactos.',
    isCore: true,
  },
  inventario: {
    id: 'inventario',
    name: 'Inventario de Mercancías',
    category: 'operaciones',
    description: 'Control de existencias, costos de adquisición, valuación de activos y reposición.',
  },
  catalogo: {
    id: 'catalogo',
    name: 'Inventario de Mercancías',
    category: 'operaciones',
    description: 'Control de existencias, costos de adquisición, valuación de activos y reposición.',
  },
  calendario: {
    id: 'calendario',
    name: 'Citas & Reservas',
    category: 'operaciones',
    description: 'Agenda de turnos, gestión de recursos (humanos y canchas/espacios).',
  },
  equipo: {
    id: 'equipo',
    name: 'Personal & Nómina',
    category: 'administracion',
    description: 'Gestión de colaboradores, contratos, comisiones y liquidación de sueldos.',
  },
  caja: {
    id: 'caja',
    name: 'Caja POS',
    category: 'comercial',
    description: 'Punto de venta, cobros en mostrador y gestión de sesiones de caja.',
  },
  compras: {
    id: 'compras',
    name: 'Compras & Proveedores',
    category: 'operaciones',
    description: 'Órdenes de compra, recepción de mercancía y cuentas por pagar.',
  },
  contabilidad: {
    id: 'contabilidad',
    name: 'Contabilidad NIIF',
    category: 'finanzas',
    description: 'Libro diario, balance de comprobación y estados financieros.',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp CRM',
    category: 'comercial',
    description: 'Bandeja omnicanal de soporte y recordatorios automáticos.',
  },
  kanban: {
    id: 'kanban',
    name: 'Órdenes de Trabajo',
    category: 'operaciones',
    description: 'Flujos visuales de servicio, diagnóstico y entregas.',
  },
  estadisticas: {
    id: 'estadisticas',
    name: 'Reportes & Estadísticas',
    category: 'finanzas',
    description: 'Métricas gerenciales y análisis de rendimiento.',
  },
  franquicias: {
    id: 'franquicias',
    name: 'Franquicias & Sedes',
    category: 'administracion',
    description: 'Control de múltiples locales y consolidación.',
  },
  integraciones: {
    id: 'integraciones',
    name: 'Integraciones & APIs',
    category: 'administracion',
    description: 'Conectores con pasarelas de pago y servicios externos.',
  },
  odontologia: {
    id: 'odontologia',
    name: 'Odontología & Salud Dental',
    category: 'operaciones',
    description: 'Odontograma digital interactivo, ortodoncia con brackets, endodoncia, periodoncia y procesos Kanban dentales.',
    dependencies: ['clientes', 'calendario', 'kanban'],
  },
  ginecologia: {
    id: 'ginecologia',
    name: 'Ginecología & Obstetricia',
    category: 'operaciones',
    description: 'Fórmula obstétrica G-P-C-A, gestograma en vivo por FUM, control prenatal, citología Bethesda, colposcopia y procedimientos gineco-obstétricos.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  cardiologia: {
    id: 'cardiologia',
    name: 'Cardiología & Cardiovascular',
    category: 'operaciones',
    description: 'Evaluación cardiovascular, electrocardiograma de 12 derivaciones, control de hipertensión arterial, MAPA y Holter de arritmia.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  med_cardiologia: {
    id: 'med_cardiologia',
    name: 'Especialidad: Cardiología & Cardiovascular',
    category: 'operaciones',
    description: 'Evaluación cardiovascular, electrocardiograma, MAPA y Holter de arritmia.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  pediatria: {
    id: 'pediatria',
    name: 'Pediatría & Puericultura',
    category: 'operaciones',
    description: 'Control de niño sano, percentiles antropométricos OMS, esquema de inmunización y dosificación pediátrica por kg.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  dermatologia: {
    id: 'dermatologia',
    name: 'Dermatología & Estética',
    category: 'operaciones',
    description: 'Fototipo de Fitzpatrick, regla dermatoscópica ABCDE, mapeo de lesiones cutáneas y protocolos dermoestéticos.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  traumatologia: {
    id: 'traumatologia',
    name: 'Traumatología & Fisioterapia',
    category: 'operaciones',
    description: 'Goniometría articular (ROM), fuerza muscular de Daniels, maniobras ortopédicas y plan de rehabilitación física.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  oftalmologia: {
    id: 'oftalmologia',
    name: 'Oftalmología & Optometría',
    category: 'operaciones',
    description: 'Agudeza visual Snellen, refracción subjetiva OD/OI (Esfera, Cilindro, Eje, Adición, DIP) y tonometría ocular.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  clinica: {
    id: 'clinica',
    name: 'Clínica Médica (Base)',
    category: 'operaciones',
    description: 'Historia clínica electrónica multipropósito, triaje de signos vitales, récipe médico y despacho a Caja POS.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  med_general: {
    id: 'med_general',
    name: 'Medicina General e Interna',
    category: 'operaciones',
    description: 'Consulta integral de medicina interna, evaluación por sistemas, riesgo cardiovascular y control metabólico.',
    dependencies: ['clientes', 'calendario', 'caja'],
  },
  med_pediatria: {
    id: 'med_pediatria',
    name: 'Especialidad: Pediatría y Puericultura',
    category: 'operaciones',
    description: 'Control de niño sano, percentiles antropométricos OMS, esquema de inmunización y dosificación pediátrica por kg.',
    dependencies: ['clinica'],
  },
  med_ginecologia: {
    id: 'med_ginecologia',
    name: 'Especialidad: Ginecología y Obstetricia',
    category: 'operaciones',
    description: 'Fórmula obstétrica, calculadora gestacional por FUM, control prenatal, citología y colposcopia.',
    dependencies: ['clinica'],
  },
  med_dermatologia: {
    id: 'med_dermatologia',
    name: 'Especialidad: Dermatología y Estética',
    category: 'operaciones',
    description: 'Fototipo de Fitzpatrick, regla dermatoscópica ABCDE, mapeo de lesiones cutáneas y protocolos dermoestéticos.',
    dependencies: ['clinica'],
  },
  med_traumatologia: {
    id: 'med_traumatologia',
    name: 'Especialidad: Traumatología y Fisioterapia',
    category: 'operaciones',
    description: 'Goniometría articular (ROM), fuerza muscular de Daniels, maniobras ortopédicas y plan de rehabilitación física.',
    dependencies: ['clinica'],
  },
  med_oftalmologia: {
    id: 'med_oftalmologia',
    name: 'Especialidad: Oftalmología y Optometría',
    category: 'operaciones',
    description: 'Agudeza visual Snellen, refracción subjetiva OD/OI (Esfera, Cilindro, Eje, Adición, DIP) y tonometría ocular.',
    dependencies: ['clinica'],
  },
  barberia: {
    id: 'barberia',
    name: 'Barbería & Estilo Masculino',
    category: 'operaciones',
    description: 'Estación de silla de barbero, turnos walk-in, ritual de toalla caliente, cortes degradados/fade, venta de productos y comisiones.',
    dependencies: ['clientes', 'caja'],
  },
  grooming: {
    id: 'grooming',
    name: 'Peluquería & Spa Canino',
    category: 'operaciones',
    description: 'Ficha de mascotas, razas, tipos de manto, control de temperamento, inspección de nudos/parásitos y pipeline de baño/corte.',
    dependencies: ['clientes', 'caja'],
  },
  suscripciones: {
    id: 'suscripciones',
    name: 'Suscripciones & Membresías',
    category: 'comercial',
    description: 'Gestión de planes recurrentes, cuotas, membresías de academia/club, cortes de cobro y recordatorios.',
    dependencies: ['clientes', 'caja'],
  },
  produccion: {
    id: 'produccion',
    name: 'Producción & Recetas (MRP)',
    category: 'operaciones',
    description: 'Formulación y listas de materiales (BOM), escandallos, cálculo de costo unitario y transformación automática de inventario.',
    dependencies: ['inventario'],
  },
};

export const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  'config',
  'clientes',
  'inventario',
  'calendario',
  'equipo',
  'caja',
  'contabilidad',
  'compras',
  'whatsapp',
  'kanban',
  'estadisticas',
  'franquicias',
  'odontologia',
  'ginecologia',
  'clinica',
  'med_general',
  'med_pediatria',
  'med_ginecologia',
  'med_dermatologia',
  'med_traumatologia',
  'med_oftalmologia',
  'barberia',
  'grooming',
];

/**
 * Verifica de forma síncrona si un módulo está activo para una lista de módulos habilitados.
 */
export function isModuleActive(
  activeModules: string[] | undefined | null,
  moduleId: ModuleId
): boolean {
  // Rendo Hub es la consola central SaaS, nunca un módulo de clientes
  if (moduleId === 'admin') return false;
  // Módulos core siempre activos
  if (MODULE_CATALOG[moduleId]?.isCore) return true;
  if (!activeModules || activeModules.length === 0) {
    if (moduleId === 'clinica') {
      return DEFAULT_ENABLED_MODULES.includes('clinica') ||
        MEDICAL_SPECIALTY_MODULE_IDS.some(id => DEFAULT_ENABLED_MODULES.includes(id));
    }
    if (moduleId === 'ginecologia') {
      return DEFAULT_ENABLED_MODULES.includes('ginecologia') || DEFAULT_ENABLED_MODULES.includes('med_ginecologia');
    }
    if (moduleId === 'med_ginecologia') {
      return DEFAULT_ENABLED_MODULES.includes('med_ginecologia') || DEFAULT_ENABLED_MODULES.includes('ginecologia');
    }
    return DEFAULT_ENABLED_MODULES.includes(moduleId);
  }
  if (moduleId === 'clinica') {
    return activeModules.includes('clinica') ||
      activeModules.some(m => m.startsWith('med_') || m === 'cardiologia' || m === 'ginecologia' || m === 'pediatria' || m === 'dermatologia' || m === 'traumatologia' || m === 'oftalmologia');
  }
  if (moduleId === 'ginecologia' || moduleId === 'med_ginecologia') {
    return activeModules.includes('ginecologia') || activeModules.includes('med_ginecologia');
  }
  if (moduleId === 'cardiologia' || moduleId === 'med_cardiologia') {
    return activeModules.includes('cardiologia') || activeModules.includes('med_cardiologia');
  }
  if (moduleId === 'pediatria' || moduleId === 'med_pediatria') {
    return activeModules.includes('pediatria') || activeModules.includes('med_pediatria');
  }
  if (moduleId === 'dermatologia' || moduleId === 'med_dermatologia') {
    return activeModules.includes('dermatologia') || activeModules.includes('med_dermatologia');
  }
  if (moduleId === 'traumatologia' || moduleId === 'med_traumatologia') {
    return activeModules.includes('traumatologia') || activeModules.includes('med_traumatologia');
  }
  if (moduleId === 'oftalmologia' || moduleId === 'med_oftalmologia') {
    return activeModules.includes('oftalmologia') || activeModules.includes('med_oftalmologia');
  }
  return activeModules.includes(moduleId) || 
    (moduleId === 'inventario' && activeModules.includes('catalogo')) || 
    (moduleId === 'catalogo' && activeModules.includes('inventario'));
}

/**
 * Caché en memoria para los módulos activos por tenant (TTL 30 segundos).
 * Evita N+1 queries adicionales a la BD por cada Server Action.
 * Se invalida automáticamente al expirar el TTL.
 */
const _moduleCache = new Map<string, { list: string[]; expiresAt: number }>();
const MODULE_CACHE_TTL_MS = 30_000; // 30 segundos

/**
 * Invalida el caché de módulos de un tenant específico.
 * Llama esta función después de activar/desactivar módulos en /apps.
 */
export function invalidateModuleCache(tenantId: string): void {
  _moduleCache.delete(`modules_${tenantId}`);
}

/**
 * Valida a nivel de Backend / Server Action si un módulo está activado para el tenant.
 * Previene llamadas ilegales a módulos que el tenant tiene apagados.
 */
export async function assertModuleEnabled(
  tenantId: string,
  moduleId: ModuleId
): Promise<{ authorized: boolean; error?: string }> {
  try {
    if (MODULE_CATALOG[moduleId]?.isCore) {
      return { authorized: true };
    }

    // Intentar caché primero (FIX A2: evitar N+1 queries)
    const cacheKey = `modules_${tenantId}`;
    const cached = _moduleCache.get(cacheKey);
    let enabledList: string[];

    if (cached && cached.expiresAt > Date.now()) {
      enabledList = cached.list;
    } else {
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
      const { data: tenant, error } = await supabaseAdmin
        .from('tenants')
        .select('active_modules, metadata')
        .eq('id', tenantId)
        .single();

      if (error || !tenant) {
        return { authorized: false, error: 'Empresa no encontrada.' };
      }

      const rawModules = (tenant.active_modules && tenant.active_modules.length > 0)
        ? tenant.active_modules
        : (tenant.metadata as { active_modules?: string[] })?.active_modules;

      enabledList = (rawModules && rawModules.length > 0) ? rawModules : DEFAULT_ENABLED_MODULES;

      _moduleCache.set(cacheKey, { list: enabledList, expiresAt: Date.now() + MODULE_CACHE_TTL_MS });
    }

    const isTargetEnabled = enabledList.includes(moduleId) || 
      (moduleId === 'clinica' && (enabledList.some(m => m.startsWith('med_')) || enabledList.includes('ginecologia'))) ||
      (moduleId === 'ginecologia' && (enabledList.includes('med_ginecologia') || enabledList.includes('clinica'))) ||
      (moduleId === 'med_ginecologia' && (enabledList.includes('ginecologia') || enabledList.includes('clinica'))) ||
      (moduleId === 'inventario' && enabledList.includes('catalogo')) || 
      (moduleId === 'catalogo' && enabledList.includes('inventario'));

    if (!isTargetEnabled) {
      const moduleDef = MODULE_CATALOG[moduleId];
      return {
        authorized: false,
        error: `El módulo "${moduleDef?.name || moduleId}" está desactivado para esta empresa. Actívalo en el Marketplace de Apps.`,
      };
    }

    return { authorized: true };
  } catch (err: unknown) {
    console.error('[assertModuleEnabled Error]:', err);
    return { authorized: false, error: 'Error al verificar la disponibilidad del módulo.' };
  }
}

/**
 * Obtiene las dependencias obligatorias de un módulo.
 */
export function getModuleDependencies(moduleId: string): ModuleId[] {
  const def = MODULE_CATALOG[moduleId as ModuleId];
  return def?.dependencies || [];
}

/**
 * Resuelve las dependencias requeridas para activar un módulo en cascada.
 * Devuelve los módulos que deben agregarse y el conjunto total resultante.
 */
export function resolveDependenciesForActivation(
  targetModuleId: string,
  currentActiveModules: string[]
): {
  requiredModulesToAdd: string[];
  allResultingModules: string[];
} {
  const toAdd = new Set<string>();
  const visited = new Set<string>();

  function collect(modId: string) {
    if (visited.has(modId)) return;
    visited.add(modId);

    const deps = getModuleDependencies(modId);
    for (const dep of deps) {
      if (!currentActiveModules.includes(dep)) {
        toAdd.add(dep);
      }
      collect(dep);
    }
  }

  collect(targetModuleId);

  // Sincronización transparente de alias para módulos médicos
  const specialtyAliasMap: Record<string, string> = {
    ginecologia: 'med_ginecologia',
    cardiologia: 'med_cardiologia',
    pediatria: 'med_pediatria',
    dermatologia: 'med_dermatologia',
    traumatologia: 'med_traumatologia',
    oftalmologia: 'med_oftalmologia',
  };

  const alias = specialtyAliasMap[targetModuleId];
  if (alias && !currentActiveModules.includes(alias)) {
    toAdd.add(alias);
  }

  const allResultingModules = Array.from(new Set([...currentActiveModules, targetModuleId, ...toAdd]));
  return {
    requiredModulesToAdd: Array.from(toAdd),
    allResultingModules,
  };
}

/**
 * Comprueba si un módulo puede desactivarse de forma segura o si otros módulos activos dependen de él.
 */
export function checkModuleDeactivationDependencies(
  targetModuleId: string,
  currentActiveModules: string[]
): {
  canDeactivate: boolean;
  blockingModules: { id: string; name: string }[];
} {
  const blocking: { id: string; name: string }[] = [];

  for (const activeMod of currentActiveModules) {
    if (activeMod === targetModuleId) continue;
    // Ignorar pares de alias (ej. ginecologia <-> med_ginecologia, cardiologia <-> med_cardiologia) como bloqueo mutuo
    const isSpecialtyAliasPair = (a: string, b: string) => {
      const cleanA = a.replace('med_', '');
      const cleanB = b.replace('med_', '');
      return cleanA === cleanB;
    };

    if (isSpecialtyAliasPair(targetModuleId, activeMod)) {
      continue;
    }
    const deps = getModuleDependencies(activeMod);
    if (deps.includes(targetModuleId as ModuleId)) {
      const def = MODULE_CATALOG[activeMod as ModuleId];
      blocking.push({ id: activeMod, name: def?.name || activeMod });
    }
  }

  return {
    canDeactivate: blocking.length === 0,
    blockingModules: blocking,
  };
}
