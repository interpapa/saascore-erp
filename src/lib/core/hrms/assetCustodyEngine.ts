/**
 * SaaSCore ERP - Custodia de Activos Corporativos (HRMS)
 * 
 * Gestiona el control de asignación de activos de la empresa (laptops, vehículos,
 * herramientas, teléfonos) a empleados con registro de estado y fecha de entrega.
 */

export interface CorporateAsset {
  id: string;
  tenantId: string;
  assetName: string;
  serialNumber: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: 'available' | 'assigned' | 'under_maintenance' | 'retired';
  assignmentDate?: string;
}

/**
 * Asigna un activo disponible a un empleado específico.
 */
export function assignAssetToEmployee(
  asset: CorporateAsset,
  employeeId: string,
  employeeName: string
): { success: boolean; updatedAsset?: CorporateAsset; error?: string } {
  if (asset.status === 'assigned') {
    return { success: false, error: `El activo ${asset.assetName} ya está asignado a ${asset.assignedEmployeeName}.` };
  }

  if (asset.status === 'under_maintenance' || asset.status === 'retired') {
    return { success: false, error: `El activo ${asset.assetName} no está disponible para asignación.` };
  }

  const updatedAsset: CorporateAsset = {
    ...asset,
    assignedEmployeeId: employeeId,
    assignedEmployeeName: employeeName,
    status: 'assigned',
    assignmentDate: new Date().toISOString(),
  };

  return { success: true, updatedAsset };
}
