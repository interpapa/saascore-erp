'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { explodeBOM, BillOfMaterials } from '@/lib/core/mrp/mrpEngine';
import { processManufacturingOrder } from '@/lib/core/mrp/manufacturingEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { revalidatePath } from 'next/cache';

export async function checkBOMExplosionAction(
  bom: BillOfMaterials,
  quantity: number,
  currentStockMapObj: Record<string, number>,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    const stockMap = new Map(Object.entries(currentStockMapObj));
    const result = explodeBOM(bom, quantity, stockMap);

    return { success: true, result };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function executeManufacturingOrderAction(
  bom: BillOfMaterials,
  productionQuantity: number,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'mutation');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas órdenes de producción.' };
    }

    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado a manufactura.' };
    }

    const res = await processManufacturingOrder({
      tenantId,
      bom,
      productionQuantity,
      actorEmail: actor.email,
    });

    if (res.success) {
      revalidatePath('/catalogo');
    }

    return res;
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
