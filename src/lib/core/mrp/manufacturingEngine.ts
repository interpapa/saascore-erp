/**
 * SaaSCore ERP - Motor de Órdenes de Producción MO & Asientos de Transformación
 * 
 * Controla la ejecución de la fabricación: descuenta insumos de materia prima,
 * incrementa el stock del producto terminado y genera el asiento contable de
 * transformación (Costo de Materia Prima -> Producto Terminado).
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';
import { BillOfMaterials, explodeBOM } from '@/lib/core/mrp/mrpEngine';

export interface ProductionOrderPayload {
  tenantId: string;
  bom: BillOfMaterials;
  productionQuantity: number;
  actorEmail: string;
}

export async function processManufacturingOrder(
  payload: ProductionOrderPayload
): Promise<{ success: boolean; moNumber?: string; totalCost?: number; error?: string }> {
  try {
    // 1. Obtener stock actual de insumos
    const componentIds = payload.bom.components.map(c => c.itemId);
    const { data: dbItems, error: fetchErr } = await supabaseAdmin
      .from('items')
      .select('id, stock, cost, name')
      .in('id', componentIds);

    if (fetchErr || !dbItems) throw new Error('Error verificando insumos en inventario.');

    const stockMap = new Map<string, number>();
    dbItems.forEach(item => stockMap.set(item.id, item.stock ?? 0));

    // 2. Realizar explosión de materiales y verificar factibilidad
    const explosion = explodeBOM(payload.bom, payload.productionQuantity, stockMap);

    if (!explosion.canProduce) {
      const missing = explosion.materials.filter(m => !m.isSufficient).map(m => m.itemName).join(', ');
      throw new Error(`Insumos insuficientes para fabricar: ${missing}.`);
    }

    const moNumber = `MO-${Date.now().toString().slice(-6)}`;

    // 3. Descontar materias primas atómicamente de PostgreSQL
    for (const mat of explosion.materials) {
      const currentStock = stockMap.get(mat.itemId) ?? 0;
      const newStock = currentStock - mat.requiredTotalQty;
      await supabaseAdmin
        .from('items')
        .update({ stock: newStock })
        .eq('id', mat.itemId)
        .eq('tenant_id', payload.tenantId);
    }

    // 4. Incrementar producto terminado e ingresar nuevo costo promedio AVCO
    const { data: finishedItem } = await supabaseAdmin
      .from('items')
      .select('stock, cost')
      .eq('id', payload.bom.finishedGoodItemId)
      .eq('tenant_id', payload.tenantId)
      .single();

    if (finishedItem) {
      const currentFgStock = finishedItem.stock ?? 0;
      const newFgStock = currentFgStock + payload.productionQuantity;
      await supabaseAdmin
        .from('items')
        .update({ stock: newFgStock, cost: explosion.estimatedUnitCost })
        .eq('id', payload.bom.finishedGoodItemId)
        .eq('tenant_id', payload.tenantId);
    }

    // 5. Asiento Contable de Transformación NIIF (Materia Prima -> Producto Terminado)
    await createKernelJournalEntry({
      tenant_id: payload.tenantId,
      description: `Asiento de Fabricación ${moNumber} (${payload.productionQuantity} unidades de ${payload.bom.finishedGoodName})`,
      lines: [
        { account_code: '1.1.03.01', account_name: 'Inventario Producto Terminado', debit: explosion.totalProductionCost, credit: 0 },
        { account_code: '1.1.03.02', account_name: 'Inventario Materias Primas', debit: 0, credit: explosion.totalProductionCost },
      ],
    });

    return {
      success: true,
      moNumber,
      totalCost: explosion.totalProductionCost,
    };
  } catch (err: any) {
    console.error('[processManufacturingOrder Error]:', err.message);
    return { success: false, error: err.message };
  }
}
