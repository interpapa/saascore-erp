/**
 * Rendo ERP - Motor Fiscal de Facturación Digital
 * Conforme a la Providencia Administrativa N.º SNAT/2026/00093
 * Gaceta Oficial N.º 43.484 del 21 de octubre de 2026
 *
 * Regulaciones implementadas:
 * - Emisión digital libre sin dependencia de máquina fiscal obligatoria.
 * - Registro obligatorio de hora con segundos exactos (HH:MM:SS a.m./p.m.) - Art. 8.
 * - Desglose simultáneo bimoneda obligatorio (USD y VES) con tasa oficial BCV y fecha.
 * - Domicilio fiscal completo del comprador obligatorio para todo documento digital.
 * - Identificación de alícuotas: Gravado (G = 16%), Exento (E = 0%), Reducido (R = 8%).
 * - Cálculo de IGTF (3%) en pagos en divisas cuando aplique.
 * - Liquidación de retenciones de IVA (75% / 100%) e ISLR de Contribuyentes Especiales.
 * - Trazabilidad criptográfica: Hash SHA-256 canónico y generación de carga útil para Código QR.
 * - Leyenda legal formal exigida por la Providencia 00093.
 */

import Decimal from 'decimal.js';
import * as crypto from 'crypto';

export const PROVIDENCIA_00093_NOTICE =
  'Documento emitido conforme a la Providencia Administrativa N.º SNAT/2026/00093 (Gaceta Oficial N.º 43.484)';

export type TaxCategoryCode = 'G' | 'E' | 'R';

export interface FiscalPartyInfo {
  businessName: string;
  taxId: string; // RIF (J-, V-, G-, E-)
  fiscalAddress: string; // Obligatorio por Art. 8
  phone?: string;
  email?: string;
  isSpecialTaxpayer?: boolean;
}

export interface FiscalDocumentLineInput {
  itemId?: string | null;
  description: string;
  quantity: number;
  unitPriceUsd: number;
  taxCategory?: TaxCategoryCode; // Por defecto 'G' (16%) salvo ítems exentos 'E'
  customTaxRate?: number; // Ej. 16 para G, 0 para E, 8 para R
}

export interface DualCurrencyTotals {
  bcvRate: number;
  bcvRateDate: string;
  
  // Gravados
  taxableAmountUsd: number;
  taxableAmountVes: number;
  
  // Exentos
  exemptAmountUsd: number;
  exemptAmountVes: number;
  
  // IVA
  ivaAmountUsd: number;
  ivaAmountVes: number;
  
  // IGTF (si aplica)
  igtfRate: number;
  igtfAmountUsd: number;
  igtfAmountVes: number;
  
  // Totales
  totalAmountUsd: number;
  totalAmountVes: number;
  
  // Retenciones fiscales (B2B / Clientes Especiales)
  retentionVoucherNumber?: string;
  retentionIvaRate?: number; // 75 o 100
  retentionIvaAmountUsd?: number;
  retentionIvaAmountVes?: number;
  retentionIslrRate?: number; // Ej. 1, 2, 5
  retentionIslrAmountUsd?: number;
  retentionIslrAmountVes?: number;
  
  // Neto a Pagar
  netPayableUsd: number;
  netPayableVes: number;
}

export interface DigitalInvoicePayload {
  documentNumber: string;
  controlNumber: string;
  controlRange: string;
  issueTimestamp: string; // YYYY-MM-DD hh:mm:ss a.m./p.m.
  seller: FiscalPartyInfo;
  buyer: FiscalPartyInfo;
  lines: Array<{
    itemId?: string | null;
    description: string;
    quantity: number;
    unitPriceUsd: number;
    unitPriceVes: number;
    taxCategory: TaxCategoryCode;
    taxRate: number;
    subtotalUsd: number;
    subtotalVes: number;
    taxAmountUsd: number;
    taxAmountVes: number;
    totalUsd: number;
    totalVes: number;
  }>;
  totals: DualCurrencyTotals;
  digitalHashSha256: string;
  qrPayload: string;
  statutoryNotice: string;
  contingencyMode?: boolean;
}

/**
 * Formatea una fecha con marca temporal exacta incluyendo segundos y designación a.m./p.m.
 * Obligatorio según el Artículo 8 de la Providencia SNAT/2026/00093.
 * Ejemplo: "2026-11-19 03:15:42 p.m."
 */
export function formatFiscalTimestampWithSeconds(dateInput?: Date | string): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12;
  hours = hours ? hours : 12; // Formato 12 horas con a.m./p.m.
  const hoursFormatted = String(hours).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hoursFormatted}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Normaliza y valida el RIF venezolano (J-, V-, E-, G-, P-)
 */
export function sanitizeVenezuelanTaxId(rawTaxId: string): string {
  if (!rawTaxId) return '';
  const clean = rawTaxId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  
  const validPrefixes = ['J', 'V', 'E', 'G', 'P'];
  const firstChar = clean[0];
  
  if (validPrefixes.includes(firstChar)) {
    return `${firstChar}-${clean.substring(1)}`;
  }
  // Si introdujeron solo números, por defecto 'J' si es de empresa o 'V' si es persona
  return clean.length >= 8 && clean.startsWith('1') || clean.startsWith('2') || clean.startsWith('3')
    ? `V-${clean}`
    : `J-${clean}`;
}

/**
 * Motor de Cálculo Bimoneda con Decimal.js conforme a la Providencia SNAT/2026/00093.
 * Realiza el cálculo simultáneo de bases imponibles, alícuotas (16%, 8%, 0%),
 * conversión exacta al cambio oficial BCV, IGTF (3%) y liquidación de retenciones.
 */
export function calculateProvidencia00093Totals(params: {
  lines: FiscalDocumentLineInput[];
  bcvRate: number;
  bcvRateDate?: string;
  applyIgtf?: boolean; // Aplica 3% si el pago es en divisas en efectivo
  retentionIvaRate?: number; // 75 o 100 (% de retención sobre el IVA)
  retentionIslrRate?: number; // Ej. 1, 2, 5 (% de retención sobre la base imponible)
  retentionVoucherNumber?: string;
}): DualCurrencyTotals {
  const bcv = new Decimal(params.bcvRate > 0 ? params.bcvRate : 1);
  const bcvDate = params.bcvRateDate || new Date().toISOString().split('T')[0];

  let taxableUsd = new Decimal(0);
  let exemptUsd = new Decimal(0);
  let ivaUsd = new Decimal(0);

  for (const line of params.lines) {
    const qty = new Decimal(line.quantity || 1);
    const price = new Decimal(line.unitPriceUsd || 0);
    const lineSubtotal = qty.times(price);

    const category = line.taxCategory || 'G';
    const ratePercent = category === 'E' 
      ? 0 
      : (typeof line.customTaxRate === 'number' ? line.customTaxRate : (category === 'R' ? 8 : 16));

    if (category === 'E' || ratePercent === 0) {
      exemptUsd = exemptUsd.plus(lineSubtotal);
    } else {
      taxableUsd = taxableUsd.plus(lineSubtotal);
      const lineTax = lineSubtotal.times(ratePercent).dividedBy(100);
      ivaUsd = ivaUsd.plus(lineTax);
    }
  }

  // Redondeo fiscal estándar a 2 decimales
  const taxableAmountUsd = taxableUsd.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const exemptAmountUsd = exemptUsd.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const ivaAmountUsd = ivaUsd.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Contravalores en Bolívares (VES) a tasa oficial BCV
  const taxableAmountVes = taxableAmountUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const exemptAmountVes = exemptAmountUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const ivaAmountVes = ivaAmountUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Cálculo de IGTF (3%) si aplica
  let igtfAmountUsd = new Decimal(0);
  let igtfAmountVes = new Decimal(0);
  const igtfRate = params.applyIgtf ? 3 : 0;
  
  if (params.applyIgtf) {
    const baseForIgtf = taxableAmountUsd.plus(exemptAmountUsd).plus(ivaAmountUsd);
    igtfAmountUsd = baseForIgtf.times(0.03).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    igtfAmountVes = igtfAmountUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // Total Bruto de la Factura
  const totalAmountUsd = taxableAmountUsd
    .plus(exemptAmountUsd)
    .plus(ivaAmountUsd)
    .plus(igtfAmountUsd)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const totalAmountVes = taxableAmountVes
    .plus(exemptAmountVes)
    .plus(ivaAmountVes)
    .plus(igtfAmountVes)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Retenciones Fiscales (B2B / Clientes Mayoristas Contribuyentes Especiales)
  let retentionIvaAmountUsd = new Decimal(0);
  let retentionIvaAmountVes = new Decimal(0);
  let retentionIslrAmountUsd = new Decimal(0);
  let retentionIslrAmountVes = new Decimal(0);

  if (params.retentionIvaRate && params.retentionIvaRate > 0) {
    const ivaRetRatio = new Decimal(params.retentionIvaRate).dividedBy(100);
    retentionIvaAmountUsd = ivaAmountUsd.times(ivaRetRatio).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    retentionIvaAmountVes = ivaAmountVes.times(ivaRetRatio).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  if (params.retentionIslrRate && params.retentionIslrRate > 0) {
    const islrRetRatio = new Decimal(params.retentionIslrRate).dividedBy(100);
    retentionIslrAmountUsd = taxableAmountUsd.times(islrRetRatio).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    retentionIslrAmountVes = taxableAmountVes.times(islrRetRatio).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // Monto Neto que realmente debe pagar el cliente
  const netPayableUsd = totalAmountUsd
    .minus(retentionIvaAmountUsd)
    .minus(retentionIslrAmountUsd)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const netPayableVes = totalAmountVes
    .minus(retentionIvaAmountVes)
    .minus(retentionIslrAmountVes)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    bcvRate: bcv.toNumber(),
    bcvRateDate: bcvDate,
    taxableAmountUsd: taxableAmountUsd.toNumber(),
    taxableAmountVes: taxableAmountVes.toNumber(),
    exemptAmountUsd: exemptAmountUsd.toNumber(),
    exemptAmountVes: exemptAmountVes.toNumber(),
    ivaAmountUsd: ivaAmountUsd.toNumber(),
    ivaAmountVes: ivaAmountVes.toNumber(),
    igtfRate,
    igtfAmountUsd: igtfAmountUsd.toNumber(),
    igtfAmountVes: igtfAmountVes.toNumber(),
    totalAmountUsd: totalAmountUsd.toNumber(),
    totalAmountVes: totalAmountVes.toNumber(),
    retentionVoucherNumber: params.retentionVoucherNumber,
    retentionIvaRate: params.retentionIvaRate,
    retentionIvaAmountUsd: retentionIvaAmountUsd.toNumber(),
    retentionIvaAmountVes: retentionIvaAmountVes.toNumber(),
    retentionIslrRate: params.retentionIslrRate,
    retentionIslrAmountUsd: retentionIslrAmountUsd.toNumber(),
    retentionIslrAmountVes: retentionIslrAmountVes.toNumber(),
    netPayableUsd: netPayableUsd.toNumber(),
    netPayableVes: netPayableVes.toNumber(),
  };
}

/**
 * Genera el Hash Criptográfico SHA-256 de la factura digital a partir de su cadena canónica.
 * Garantiza inalterabilidad y no repudio según el Art. 8.
 */
export function generateFiscalHashSha256(canonicalString: string): string {
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Construye la carga útil estandarizada para el Código QR de verificación fiscal.
 * Contiene los datos requeridos por la administración tributaria para validación telemática instantánea.
 */
export function buildFiscalQRPayload(params: {
  sellerTaxId: string;
  buyerTaxId: string;
  documentNumber: string;
  controlNumber: string;
  issueTimestamp: string;
  totalVes: number;
  ivaVes: number;
  digitalHash: string;
}): string {
  // Cadena canónica delimitada por barras verticales (pipe |)
  const canonicalData = [
    sanitizeVenezuelanTaxId(params.sellerTaxId),
    sanitizeVenezuelanTaxId(params.buyerTaxId),
    params.documentNumber,
    params.controlNumber,
    params.issueTimestamp,
    params.totalVes.toFixed(2),
    params.ivaVes.toFixed(2),
    params.digitalHash.substring(0, 16), // Prefijo de verificación hash
  ].join('|');

  return `https://fiscal.rendo.app/verify/v1?d=${encodeURIComponent(canonicalData)}`;
}

/**
 * Ensambla un documento digital fiscal completo y validado conforme a la Providencia SNAT/2026/00093.
 */
export function createProvidencia00093Document(params: {
  documentNumber: string;
  controlNumber: string;
  controlRange: string;
  issueDate?: Date | string;
  seller: FiscalPartyInfo;
  buyer: FiscalPartyInfo;
  lines: FiscalDocumentLineInput[];
  bcvRate: number;
  bcvRateDate?: string;
  applyIgtf?: boolean;
  retentionIvaRate?: number;
  retentionIslrRate?: number;
  retentionVoucherNumber?: string;
  contingencyMode?: boolean;
}): DigitalInvoicePayload {
  // 1. Validaciones de integridad formal
  if (!params.buyer.fiscalAddress || params.buyer.fiscalAddress.trim().length === 0) {
    throw new Error('Providencia SNAT/2026/00093: El domicilio fiscal del comprador es de carácter obligatorio.');
  }
  if (!params.buyer.taxId || params.buyer.taxId.trim().length === 0) {
    throw new Error('Providencia SNAT/2026/00093: El RIF o Cédula del comprador es obligatorio.');
  }

  const issueTimestamp = formatFiscalTimestampWithSeconds(params.issueDate);
  const totals = calculateProvidencia00093Totals({
    lines: params.lines,
    bcvRate: params.bcvRate,
    bcvRateDate: params.bcvRateDate,
    applyIgtf: params.applyIgtf,
    retentionIvaRate: params.retentionIvaRate,
    retentionIslrRate: params.retentionIslrRate,
    retentionVoucherNumber: params.retentionVoucherNumber,
  });

  const bcv = new Decimal(totals.bcvRate);

  // 2. Procesar líneas con valores bimoneda
  const processedLines = params.lines.map((l) => {
    const qty = new Decimal(l.quantity || 1);
    const pUsd = new Decimal(l.unitPriceUsd || 0);
    const pVes = pUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const subUsd = qty.times(pUsd).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const subVes = subUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const cat = l.taxCategory || 'G';
    const rate = cat === 'E' ? 0 : (typeof l.customTaxRate === 'number' ? l.customTaxRate : (cat === 'R' ? 8 : 16));
    const taxUsd = subUsd.times(rate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const taxVes = taxUsd.times(bcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return {
      itemId: l.itemId || null,
      description: l.description,
      quantity: l.quantity,
      unitPriceUsd: pUsd.toNumber(),
      unitPriceVes: pVes.toNumber(),
      taxCategory: cat,
      taxRate: rate,
      subtotalUsd: subUsd.toNumber(),
      subtotalVes: subVes.toNumber(),
      taxAmountUsd: taxUsd.toNumber(),
      taxAmountVes: taxVes.toNumber(),
      totalUsd: subUsd.plus(taxUsd).toNumber(),
      totalVes: subVes.plus(taxVes).toNumber(),
    };
  });

  // 3. Cadena canónica para firma SHA-256
  const canonicalData = [
    params.documentNumber,
    params.controlNumber,
    issueTimestamp,
    sanitizeVenezuelanTaxId(params.seller.taxId),
    sanitizeVenezuelanTaxId(params.buyer.taxId),
    totals.totalAmountVes.toFixed(2),
    totals.ivaAmountVes.toFixed(2),
    totals.bcvRate.toFixed(4),
  ].join('#');

  const digitalHashSha256 = generateFiscalHashSha256(canonicalData);

  // 4. Carga útil de Código QR
  const qrPayload = buildFiscalQRPayload({
    sellerTaxId: params.seller.taxId,
    buyerTaxId: params.buyer.taxId,
    documentNumber: params.documentNumber,
    controlNumber: params.controlNumber,
    issueTimestamp,
    totalVes: totals.totalAmountVes,
    ivaVes: totals.ivaAmountVes,
    digitalHash: digitalHashSha256,
  });

  return {
    documentNumber: params.documentNumber,
    controlNumber: params.controlNumber,
    controlRange: params.controlRange,
    issueTimestamp,
    seller: {
      ...params.seller,
      taxId: sanitizeVenezuelanTaxId(params.seller.taxId),
    },
    buyer: {
      ...params.buyer,
      taxId: sanitizeVenezuelanTaxId(params.buyer.taxId),
    },
    lines: processedLines,
    totals,
    digitalHashSha256,
    qrPayload,
    statutoryNotice: PROVIDENCIA_00093_NOTICE,
    contingencyMode: !!params.contingencyMode,
  };
}
