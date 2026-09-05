// ═══════════════════════════════════════════════════
//  Rendo React: Control de Acceso Basado en Roles
// ═══════════════════════════════════════════════════

export type UserRole = 'superadmin' | 'owner' | 'manager' | 'technician' | 'seller';

export interface RBACPolicy {
  role: UserRole;
  name: string;
  permissions: string[] | '*';
}

export const defaultRoles: Record<UserRole, RBACPolicy> = {
  'superadmin': { role: 'superadmin', name: 'Arquitecto Rendo', permissions: '*' }, // Dios
  'owner': { role: 'owner', name: 'Dueño (Full Access)', permissions: '*' }, // Administrador del Negocio
  'manager': { role: 'manager', name: 'Gerente', permissions: ['crm', 'finanzas', 'inventario', 'registros', 'equipo', 'reportes'] },
  'technician': { role: 'technician', name: 'Técnico / Operativo', permissions: ['registros', 'inventario'] },
  'seller': { role: 'seller', name: 'Ventas / Cajero', permissions: ['crm', 'registros', 'finanzas'] }
};

export const checkPermission = (userRole: UserRole, requiredPermission: string): boolean => {
  const policy = defaultRoles[userRole];
  if (!policy) return false;
  if (policy.permissions === '*') return true;
  return policy.permissions.includes(requiredPermission);
};
