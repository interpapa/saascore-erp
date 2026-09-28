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
  | 'config' 
  | 'admin';

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
    isCore: true,
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
    description: 'Gestión de colaboradores, contratos, asistencia y liquidación de sueldos.',
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
    description: 'Odontograma digital interactivo, historial clínico por diente, tratamientos y procesos Kanban dentales.',
    dependencies: ['clientes', 'calendario', 'kanban'],
  },
};

export const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  'config',
  'clientes',
  'inventario',
  'catalogo',
  'calendario',
  'equipo',
  'caja',
  'contabilidad',
  'compras',
  'whatsapp',
];

/**
 * Verifica de forma síncrona si un módulo está activo para una lista de módulos habilitados.
 */
export function isModuleActive(
  activeModules: string[] | undefined | null,
  moduleId: ModuleId
): boolean {
  // Módulos core siempre activos
  if (MODULE_CATALOG[moduleId]?.isCore) return true;
  if (!activeModules || activeModules.length === 0) {
    return DEFAULT_ENABLED_MODULES.includes(moduleId) || 
      (moduleId === 'inventario' && DEFAULT_ENABLED_MODULES.includes('catalogo')) ||
      (moduleId === 'catalogo' && DEFAULT_ENABLED_MODULES.includes('inventario'));
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
      (moduleId === 'inventario' && enabledList.includes('catalogo')) || 
      (moduleId === 'catalogo' && enabledList.includes('inventario'));

    if (!isTargetEnabled) {
      const moduleDef = MODULE_CATALOG[moduleId];
      return {
        authorized: false,
        error: `El módulo "${moduleDef?.name || moduleId}" está desactivado para esta empresa. Actívalo en el Marketplace de Apps.`,
      };
    }

    // Validar dependencias requeridas (ej: Caja requiere Catálogo)
    const dependencies = MODULE_CATALOG[moduleId]?.dependencies || [];
    for (const dep of dependencies) {
      if (!enabledList.includes(dep)) {
        return {
          authorized: false,
          error: `El módulo "${MODULE_CATALOG[moduleId]?.name}" requiere que "${MODULE_CATALOG[dep]?.name}" esté activo.`,
        };
      }
    }

    return { authorized: true };
  } catch (err: unknown) {
    console.error('[assertModuleEnabled Error]:', err);
    return { authorized: false, error: 'Error al verificar la disponibilidad del módulo.' };
  }
}
