/**
 * Rendo - Motor de Trazabilidad por Lotes y Caducidad (FEFO / FIFO)
 * 
 * Gestiona el rastreo de número de lote, fecha de vencimiento y número de serie
 * recomendando salidas con la estrategia FEFO (First-Expired, First-Out).
 */

export interface InventoryLot {
  id: string;
  itemId: string;
  lotNumber: string;
  serialNumber?: string;
  quantity: number;
  expirationDate?: string; // ISO String
  createdAt: string;
}

/**
 * Ordena una lista de lotes por la estrategia FEFO (Primero en vencer, primero en salir).
 * Los lotes sin fecha de caducidad se colocan al final bajo estrategia FIFO.
 */
export function sortLotsByFEFO(lots: InventoryLot[]): InventoryLot[] {
  return [...lots].sort((a, b) => {
    // Si ambos tienen fecha de vencimiento, ordenar por fecha más cercana
    if (a.expirationDate && b.expirationDate) {
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    }
    // Lote con caducidad va antes que lote sin caducidad
    if (a.expirationDate) return -1;
    if (b.expirationDate) return 1;
    // Si ninguno tiene fecha de caducidad, ordenar por fecha de ingreso (FIFO)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Revisa si algún lote de la lista está vencido a la fecha actual.
 */
export function getExpiredLots(lots: InventoryLot[], referenceDate = new Date()): InventoryLot[] {
  const refTime = referenceDate.getTime();
  return lots.filter(lot => {
    if (!lot.expirationDate) return false;
    return new Date(lot.expirationDate).getTime() < refTime;
  });
}
