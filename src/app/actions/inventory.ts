'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { convertUoM } from '@/lib/core/inventory/uomEngine';
import { calculateAVCO } from '@/lib/core/inventory/avcoEngine';
import { sortLotsByFEFO, InventoryLot } from '@/lib/core/inventory/lotTrackingEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function convertUoMAction(
  quantity: number,
  fromCode: string,
  toCode: string
) {
  return convertUoM(quantity, fromCode, toCode);
}

export async function processInventoryReceiptAction(
  itemId: string,
  purchasedQty: number,
  purchasedUnitCost: number,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'mutation');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas operaciones de inventario.' };
    }

    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    // Obtener ítem actual
    const { data: item, error: fetchErr } = await supabaseAdmin
      .from('items')
      .select('stock, cost')
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !item) throw new Error('Ítem no encontrado.');

    // Recalcular AVCO
    const avco = calculateAVCO({
      currentStock: item.stock ?? 0,
      currentCost: Number(item.cost || 0),
      newPurchasedQuantity: purchasedQty,
      newPurchasedUnitCost: purchasedUnitCost,
    });

    // Actualizar ítem con nuevo stock y costo promedio ponderado
    const { data: updatedItem, error: updateErr } = await supabaseAdmin
      .from('items')
      .update({
        stock: avco.newStock,
        cost: avco.newAverageCost,
      })
      .eq('id', itemId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return { success: true, item: updatedItem, avco };
  } catch (err: unknown) {
    console.error('[processInventoryReceiptAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function getFEFOPickingOrderAction(lots: InventoryLot[]) {
  return { success: true, sortedLots: sortLotsByFEFO(lots) };
}
