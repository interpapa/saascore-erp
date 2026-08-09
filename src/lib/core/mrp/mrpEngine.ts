/**
 * SaaSCore ERP - Motor de Manufactura MES & MRP (Bill of Materials - BOM)
 * 
 * Gestiona las recetas de fabricación (BOM), la explosión automática de materiales
 * requeridos y la verificación de disponibilidad de insumos en inventario.
 */

import Decimal from 'decimal.js';

export interface BOMComponent {
  itemId: string;
  itemName: string;
  requiredQuantity: number;
  unitCost: number;
}

export interface BillOfMaterials {
  id: string;
  tenantId: string;
  finishedGoodItemId: string;
  finishedGoodName: string;
  components: BOMComponent[];
}

export interface MaterialExplosionItem {
  itemId: string;
  itemName: string;
  requiredTotalQty: number;
  availableStock: number;
  isSufficient: boolean;
  totalCost: number;
}

/**
 * Realiza la explosión de materiales para una cantidad deseada a fabricar.
 */
export function explodeBOM(
  bom: BillOfMaterials,
  productionQuantity: number,
  currentStockMap: Map<string, number>
): {
  success: boolean;
  canProduce: boolean;
  estimatedUnitCost: number;
  totalProductionCost: number;
  materials: MaterialExplosionItem[];
} {
  const prodQtyDec = new Decimal(productionQuantity);
  let totalCostDec = new Decimal(0);
  let canProduce = true;

  const materials: MaterialExplosionItem[] = bom.components.map((comp) => {
    const requiredTotalQtyDec = new Decimal(comp.requiredQuantity).times(prodQtyDec);
    const lineCostDec = requiredTotalQtyDec.times(comp.unitCost);
    totalCostDec = totalCostDec.plus(lineCostDec);

    const availableStock = currentStockMap.get(comp.itemId) ?? 0;
    const isSufficient = availableStock >= requiredTotalQtyDec.toNumber();

    if (!isSufficient) canProduce = false;

    return {
      itemId: comp.itemId,
      itemName: comp.itemName,
      requiredTotalQty: requiredTotalQtyDec.toNumber(),
      availableStock,
      isSufficient,
      totalCost: lineCostDec.toDecimalPlaces(2).toNumber(),
    };
  });

  const estimatedUnitCost = prodQtyDec.isZero() ? 0 : totalCostDec.div(prodQtyDec).toDecimalPlaces(4).toNumber();

  return {
    success: true,
    canProduce,
    estimatedUnitCost,
    totalProductionCost: totalCostDec.toDecimalPlaces(2).toNumber(),
    materials,
  };
}
