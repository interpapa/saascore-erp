'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { processPayroll, EmployeeSalaryItem } from '@/lib/core/hrms/payrollEngine';
import { assignAssetToEmployee, CorporateAsset } from '@/lib/core/hrms/assetCustodyEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';

export async function processPayrollDisbursementAction(
  periodName: string,
  employees: EmployeeSalaryItem[],
  tenantId: string,
  actor: KernelActor
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'mutation');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas solicitudes de nómina.' };
    }

    const security = await validateKernelAccess(actor, tenantId, 'nomina');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado a nómina.' };
    }

    return await processPayroll({
      tenantId,
      periodName,
      employees,
    });
  } catch (err: any) {
    console.error('[processPayrollDisbursementAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function assignAssetAction(
  asset: CorporateAsset,
  employeeId: string,
  employeeName: string,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    return assignAssetToEmployee(asset, employeeId, employeeName);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
