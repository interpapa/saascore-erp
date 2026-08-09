/**
 * SaaSCore ERP - Motor de Valoración de Inventario AVCO (Average Costing)
 * 
 * Recalcula de forma transparente el Costo Promedio Ponderado de cada ítem
 * en el catálogo al recibir recepciones de compra (Purchase Orders) y calcula
 * el Costo de Ventas (COGS) para los asientos contables.
 */

import Decimal from 'decimal.js';

export interface AVCOCalculationInput {
  currentStock: number;
  currentCost: number;
  newPurchasedQuantity: number;
  newPurchasedUnitCost: number;
}

export interface AVCOCalculationResult {
  newStock: number;
  newAverageCost: number;
  totalInventoryValue: number;
}

/**
 * Calcula el nuevo costo promedio ponderado al recibir inventario adicional.
 * Fórmula AVCO: [(Stock_Actual * Costo_Actual) + (Cant_Comprada * Costo_Compra)] / (Stock_Actual + Cant_Comprada)
 */
export function calculateAVCO(input: AVCOCalculationInput): AVCOCalculationResult {
  const currentStockDec = new Decimal(Math.max(0, input.currentStock));
  const currentCostDec = new Decimal(Math.max(0, input.currentCost));
  const newQtyDec = new Decimal(Math.max(0, input.newPurchasedQuantity));
  const newCostDec = new Decimal(Math.max(0, input.newPurchasedUnitCost));

  const newStockDec = currentStockDec.plus(newQtyDec);

  if (newStockDec.isZero()) {
    return {
      newStock: 0,
      newAverageCost: input.newPurchasedUnitCost,
      totalInventoryValue: 0,
    };
  }

  const currentValueDec = currentStockDec.times(currentCostDec);
  const newValueDec = newQtyDec.times(newCostDec);
  const totalValueDec = currentValueDec.plus(newValueDec);

  const newAverageCostDec = totalValueDec.div(newStockDec).toDecimalPlaces(4);

  return {
    newStock: newStockDec.toNumber(),
    newAverageCost: newAverageCostDec.toNumber(),
    totalInventoryValue: totalValueDec.toDecimalPlaces(2).toNumber(),
  };
}
