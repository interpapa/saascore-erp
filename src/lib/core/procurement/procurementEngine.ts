/**
 * SaaSCore ERP - Motor de Compras SRM & 3-Way Matching
 * 
 * Implementa la validación 3-Way Matching (Orden de Compra + Recibo de Almacén + Factura del Proveedor)
 * para evitar sobre-facturación y pagos no autorizados a proveedores.
 */

import Decimal from 'decimal.js';

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  supplierId: string;
  poNumber: string;
  totalAmount: number;
  status: 'draft' | 'ordered' | 'received' | 'billed' | 'closed';
}

export interface GoodsReceipt {
  id: string;
  poId: string;
  receivedAmount: number;
  receivedDate: string;
}

export interface SupplierBill {
  id: string;
  poId: string;
  billNumber: string;
  billedAmount: number;
}

/**
 * Valida la coincidencia exacta (3-Way Matching) entre la PO, el Recibo y la Factura.
 */
export function validate3WayMatch(
  po: PurchaseOrder,
  receipt: GoodsReceipt,
  bill: SupplierBill,
  tolerancePercent = 0.5 // 0.5% de tolerancia permisible por redondeos
): { matched: boolean; difference: number; statusMessage: string } {
  const poAmount = new Decimal(po.totalAmount);
  const receiptAmount = new Decimal(receipt.receivedAmount);
  const billAmount = new Decimal(bill.billedAmount);

  const poVsReceiptDiff = poAmount.minus(receiptAmount).abs();
  const poVsBillDiff = poAmount.minus(billAmount).abs();

  const maxTolerance = poAmount.times(tolerancePercent / 100);

  if (poVsReceiptDiff.gt(maxTolerance)) {
    return {
      matched: false,
      difference: poVsReceiptDiff.toNumber(),
      statusMessage: `Descuadre entre PO ($${poAmount}) y Recibo de Almacén ($${receiptAmount}).`,
    };
  }

  if (poVsBillDiff.gt(maxTolerance)) {
    return {
      matched: false,
      difference: poVsBillDiff.toNumber(),
      statusMessage: `Descuadre entre PO ($${poAmount}) y Factura del Proveedor ($${billAmount}).`,
    };
  }

  return {
    matched: true,
    difference: 0,
    statusMessage: '3-Way Match perfecto. Pago al proveedor autorizado.',
  };
}
