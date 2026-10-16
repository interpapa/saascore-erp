// ═══════════════════════════════════════════════════
//  Rendo React: Control de Acceso Basado en Roles
// ═══════════════════════════════════════════════════

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'technician' | 'seller';

export type Permission = 'crm' | 'finanzas' | 'inventario' | 'registros' | 'equipo' | 'reportes' | 'contabilidad' | 'calendario' | 'whatsapp' | 'kanban' | 'franquicias' | 'integraciones' | 'apps' | 'config' | 'admin';

export interface RBACPolicy {
  role: UserRole;
  name: string;
  permissions: Permission[] | '*';
}

export const defaultRoles: Record<UserRole, RBACPolicy> = {
  'superadmin': { role: 'superadmin', name: 'Arquitecto Rendo', permissions: '*' }, // Dios
  'owner': { role: 'owner', name: 'Dueño (Full Access)', permissions: '*' }, // Administrador del Negocio
  'manager': {
    role: 'manager',
    name: 'Gerente',
    permissions: ['crm', 'finanzas', 'inventario', 'registros', 'equipo', 'reportes', 'calendario', 'whatsapp', 'kanban', 'contabilidad']
  },
  'technician': {
    role: 'technician',
    name: 'Técnico / Operativo',
    permissions: ['registros', 'inventario', 'calendario', 'kanban']
  },
  'seller': {
    role: 'seller',
    name: 'Ventas / Cajero',
    permissions: ['crm', 'registros', 'finanzas', 'inventario', 'calendario', 'whatsapp']
  }
};

export const PERMISSION_ALIASES: Record<string, Permission> = {
  clientes: 'crm',
  catalogo: 'inventario',
  compras: 'inventario',
  configuracion: 'config',
  suscripciones: 'crm',
  produccion: 'inventario',
};

export const hasPermission = (userRole: UserRole, requiredPermission: string): boolean => {
  const policy = defaultRoles[userRole];
  if (!policy) return false;
  if (policy.permissions === '*') return true;
  const normalized = PERMISSION_ALIASES[requiredPermission] || requiredPermission;
  return policy.permissions.includes(normalized as Permission);
};

export const checkPermission = hasPermission;

