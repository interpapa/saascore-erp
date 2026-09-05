/**
 * Rendo - Motor de Conversión de Unidades de Medida (UoM Engine - ISO 9001)
 * 
 * Permite comprar en unidades mayores (ej. "Caja x 24", "Pallet x 500")
 * y vender en unidades individuales ("Unidades", "Kilos", "Litros") con conversión
 * matemática exacta de alta precisión.
 */

import Decimal from 'decimal.js';

export interface UoMDefinition {
  code: string;
  name: string;
  category: 'unit' | 'weight' | 'volume' | 'length';
  ratioToBase: number; // Ej. 1 Caja = 24 Unidades -> ratio = 24
  baseUnitCode: string; // Ej. "PZA" o "KG"
}

export const DEFAULT_UOM_REGISTRY: Record<string, UoMDefinition> = {
  PZA: { code: 'PZA', name: 'Pieza / Unidad', category: 'unit', ratioToBase: 1, baseUnitCode: 'PZA' },
  BOX12: { code: 'BOX12', name: 'Caja x 12', category: 'unit', ratioToBase: 12, baseUnitCode: 'PZA' },
  BOX24: { code: 'BOX24', name: 'Caja x 24', category: 'unit', ratioToBase: 24, baseUnitCode: 'PZA' },
  PALLET: { code: 'PALLET', name: 'Pallet x 100', category: 'unit', ratioToBase: 100, baseUnitCode: 'PZA' },
  KG: { code: 'KG', name: 'Kilogramo', category: 'weight', ratioToBase: 1, baseUnitCode: 'KG' },
  G: { code: 'G', name: 'Gramo', category: 'weight', ratioToBase: 0.001, baseUnitCode: 'KG' },
  L: { code: 'L', name: 'Litro', category: 'volume', ratioToBase: 1, baseUnitCode: 'L' },
  ML: { code: 'ML', name: 'Mililitro', category: 'volume', ratioToBase: 0.001, baseUnitCode: 'L' },
};

/**
 * Convierte una cantidad de una unidad de medida a otra dentro de la misma categoría.
 */
export function convertUoM(
  quantity: number,
  fromUoMCode: string,
  toUoMCode: string
): { success: boolean; convertedQuantity: number; baseQuantity: number; error?: string } {
  const fromUoM = DEFAULT_UOM_REGISTRY[fromUoMCode];
  const toUoM = DEFAULT_UOM_REGISTRY[toUoMCode];

  if (!fromUoM || !toUoM) {
    return { success: false, convertedQuantity: quantity, baseQuantity: quantity, error: 'Unidad de medida no registrada.' };
  }

  if (fromUoM.category !== toUoM.category) {
    return { success: false, convertedQuantity: quantity, baseQuantity: quantity, error: `No se puede convertir de ${fromUoM.category} a ${toUoM.category}.` };
  }

  const baseQuantityDecimal = new Decimal(quantity).times(fromUoM.ratioToBase);
  const convertedDecimal = baseQuantityDecimal.div(toUoM.ratioToBase).toDecimalPlaces(4);

  return {
    success: true,
    convertedQuantity: convertedDecimal.toNumber(),
    baseQuantity: baseQuantityDecimal.toDecimalPlaces(4).toNumber(),
  };
}
