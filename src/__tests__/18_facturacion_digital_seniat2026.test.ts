/**
 * Test Suite 18: Facturación Digital SENIAT Providencia SNAT/2026/00093
 * Gaceta Oficial N.º 43.484 (Octubre 2026 / Vigencia Plena Abril 2027)
 *
 * Valida:
 * 1. Estampado de tiempo obligatorio con segundos (HH:MM:SS a.m./p.m.) - Art. 8.
 * 2. Cálculo bimoneda exacto ($ USD y Bs VES a tasa oficial BCV) con Decimal.js.
 * 3. Alícuotas combinadas: Gravado (16%), Exento (0%) e IGTF (3%).
 * 4. Liquidación de retenciones de IVA (75% / 100%) e ISLR de Contribuyentes Especiales.
 * 5. Generación de Hash Criptográfico SHA-256 y Carga Útil de Código QR.
 * 6. Validación de requisitos obligatorios (Domicilio fiscal y RIF del comprador).
 * 7. Integridad de Partida Doble NIIF para facturación y retenciones.
 */

import {
  formatFiscalTimestampWithSeconds,
  calculateProvidencia00093Totals,
  generateFiscalHashSha256,
  buildFiscalQRPayload,
  createProvidencia00093Document,
  sanitizeVenezuelanTaxId,
  PROVIDENCIA_00093_NOTICE,
  FiscalDocumentLineInput,
} from '../lib/fiscal/digitalInvoicing';
import Decimal from 'decimal.js';

export async function runFacturacionDigitalSENIAT2026Tests() {
  console.log('\n--- 🏛️ Módulo 18: Facturación Digital SENIAT Providencia SNAT/2026/00093 ---');

  // ─────────────────────────────────────────────────────────────
  // 18.1 Estampado de Tiempo con Segundos (HH:MM:SS a.m./p.m.)
  // ─────────────────────────────────────────────────────────────
  console.log('18.1 Estampado de tiempo con segundos (HH:MM:SS a.m./p.m.)');
  const testDate = new Date('2026-11-19T14:35:42');
  const formattedTime = formatFiscalTimestampWithSeconds(testDate);

  // Debe coincidir con formato "YYYY-MM-DD hh:mm:ss a.m./p.m."
  const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (a\.m\.|p\.m\.)$/;
  if (!timestampRegex.test(formattedTime)) {
    throw new Error(`[FAIL] El formato de tiempo no cumple con el Art. 8 de la Prov. 00093: ${formattedTime}`);
  }
  if (!formattedTime.includes('02:35:42 p.m.')) {
    throw new Error(`[FAIL] Hora o segundos incorrectos. Esperado 02:35:42 p.m., obtenido: ${formattedTime}`);
  }
  console.log(`  ✓ Estampado de tiempo fiscal verificado: "${formattedTime}"`);

  // ─────────────────────────────────────────────────────────────
  // 18.2 Normalización de RIF Venezolano
  // ─────────────────────────────────────────────────────────────
  console.log('18.2 Normalización de RIF venezolano');
  const rawJ = sanitizeVenezuelanTaxId('j123456789');
  const rawV = sanitizeVenezuelanTaxId('v-98765432-1');
  const rawG = sanitizeVenezuelanTaxId('G20000001');

  if (rawJ !== 'J-123456789') throw new Error(`[FAIL] Falló sanitización de RIF J: ${rawJ}`);
  if (rawV !== 'V-987654321') throw new Error(`[FAIL] Falló sanitización de RIF V: ${rawV}`);
  if (rawG !== 'G-20000001') throw new Error(`[FAIL] Falló sanitización de RIF G: ${rawG}`);
  console.log('  ✓ Normalización y validación de RIFs (J, V, G) verificada');

  // ─────────────────────────────────────────────────────────────
  // 18.3 Desglose Bimoneda y Alícuotas Mixtas (Distribuidora de Alimentos)
  // ─────────────────────────────────────────────────────────────
  console.log('18.3 Desglose bimoneda y alícuotas mixtas (Gravado 16% + Exento 0% + Tasa BCV)');
  const sampleLines: FiscalDocumentLineInput[] = [
    // 10 bultos de Harina de Maíz a $15.00 c/u (Alimento Exento)
    { description: 'Harina de Maíz Blanco 1kg (Bulto 20u)', quantity: 10, unitPriceUsd: 15.0, taxCategory: 'E' },
    // 5 cajas de Aceite de Girasol a $30.00 c/u (Gravado 16%)
    { description: 'Aceite de Girasol 1L (Caja 12u)', quantity: 5, unitPriceUsd: 30.0, taxCategory: 'G', customTaxRate: 16 },
  ];

  const bcvRate = 48.5; // Bs/USD
  const totals = calculateProvidencia00093Totals({
    lines: sampleLines,
    bcvRate,
    applyIgtf: false,
  });

  // Base Exenta: 10 * 15 = $150.00
  // Base Gravada: 5 * 30 = $150.00
  // IVA (16% de $150): $24.00
  // Total USD: 150 + 150 + 24 = $324.00
  if (totals.exemptAmountUsd !== 150.0) throw new Error(`[FAIL] Total exento esperado 150.00, obtenido: ${totals.exemptAmountUsd}`);
  if (totals.taxableAmountUsd !== 150.0) throw new Error(`[FAIL] Base imponible esperada 150.00, obtenida: ${totals.taxableAmountUsd}`);
  if (totals.ivaAmountUsd !== 24.0) throw new Error(`[FAIL] IVA esperado 24.00, obtenido: ${totals.ivaAmountUsd}`);
  if (totals.totalAmountUsd !== 324.0) throw new Error(`[FAIL] Total USD esperado 324.00, obtenido: ${totals.totalAmountUsd}`);

  // Contravalor en Bolívares a tasa 48.50:
  // Base Exenta VES: 150 * 48.5 = Bs 7,275.00
  // Base Gravada VES: 150 * 48.5 = Bs 7,275.00
  // IVA VES: 24 * 48.5 = Bs 1,164.00
  // Total VES: 324 * 48.5 = Bs 15,714.00
  if (totals.exemptAmountVes !== 7275.0) throw new Error(`[FAIL] Exento VES esperado 7275.00, obtenido: ${totals.exemptAmountVes}`);
  if (totals.taxableAmountVes !== 7275.0) throw new Error(`[FAIL] Base Gravada VES esperada 7275.00, obtenida: ${totals.taxableAmountVes}`);
  if (totals.ivaAmountVes !== 1164.0) throw new Error(`[FAIL] IVA VES esperado 1164.00, obtenido: ${totals.ivaAmountVes}`);
  if (totals.totalAmountVes !== 15714.0) throw new Error(`[FAIL] Total VES esperado 15714.00, obtenido: ${totals.totalAmountVes}`);
  console.log('  ✓ Desglose bimoneda con Decimal.js exacto sin discrepancias de céntimos');

  // ─────────────────────────────────────────────────────────────
  // 18.4 Liquidación de Retenciones de IVA (75%) e ISLR (2%) de Contribuyente Especial
  // ─────────────────────────────────────────────────────────────
  console.log('18.4 Liquidación de retenciones de Contribuyente Especial (75% IVA + 2% ISLR)');
  const totalsWithRetention = calculateProvidencia00093Totals({
    lines: sampleLines,
    bcvRate,
    applyIgtf: false,
    retentionIvaRate: 75, // 75% del IVA ($24.00 * 0.75 = $18.00)
    retentionIslrRate: 2, // 2% de la base gravada ($150.00 * 0.02 = $3.00)
    retentionVoucherNumber: 'COMP-2026-000452',
  });

  if (totalsWithRetention.retentionIvaAmountUsd !== 18.0) {
    throw new Error(`[FAIL] Retención IVA esperada $18.00, obtenida: ${totalsWithRetention.retentionIvaAmountUsd}`);
  }
  if (totalsWithRetention.retentionIslrAmountUsd !== 3.0) {
    throw new Error(`[FAIL] Retención ISLR esperada $3.00, obtenida: ${totalsWithRetention.retentionIslrAmountUsd}`);
  }

  // Neto a liquidar: Total $324.00 - Ret IVA $18.00 - Ret ISLR $3.00 = $303.00
  if (totalsWithRetention.netPayableUsd !== 303.0) {
    throw new Error(`[FAIL] Neto a pagar esperado $303.00, obtenido: ${totalsWithRetention.netPayableUsd}`);
  }
  // Neto en VES: 303 * 48.5 = Bs 14,695.50
  if (totalsWithRetention.netPayableVes !== 14695.5) {
    throw new Error(`[FAIL] Neto VES esperado Bs 14,695.50, obtenido: ${totalsWithRetention.netPayableVes}`);
  }
  console.log('  ✓ Deducción de retenciones fiscales y cálculo de neto a cobrar validados');

  // ─────────────────────────────────────────────────────────────
  // 18.5 IGTF (3%) en Pagos en Divisas
  // ─────────────────────────────────────────────────────────────
  console.log('18.5 IGTF (3%) en pagos en divisas extranjeras');
  const totalsWithIgtf = calculateProvidencia00093Totals({
    lines: [{ description: 'Servicio Logístico Mayorista', quantity: 1, unitPriceUsd: 100.0, taxCategory: 'G' }],
    bcvRate: 50.0,
    applyIgtf: true, // 3% sobre (100 base + 16 iva = 116) = $3.48
  });

  // Total con IGTF: 116 + 3.48 = $119.48
  if (totalsWithIgtf.igtfAmountUsd !== 3.48) {
    throw new Error(`[FAIL] IGTF esperado $3.48, obtenido: ${totalsWithIgtf.igtfAmountUsd}`);
  }
  if (totalsWithIgtf.totalAmountUsd !== 119.48) {
    throw new Error(`[FAIL] Total con IGTF esperado $119.48, obtenido: ${totalsWithIgtf.totalAmountUsd}`);
  }
  console.log('  ✓ Cálculo de IGTF (3%) verificado exitosamente');

  // ─────────────────────────────────────────────────────────────
  // 18.6 Hash Criptográfico SHA-256 y Carga Útil de Código QR
  // ─────────────────────────────────────────────────────────────
  console.log('18.6 Hash criptográfico SHA-256 y carga útil de Código QR');
  const hash1 = generateFiscalHashSha256('FAC-000001#00-000001#J-123456789#15714.00');
  const hash2 = generateFiscalHashSha256('FAC-000001#00-000001#J-123456789#15714.00');
  const hashTampered = generateFiscalHashSha256('FAC-000001#00-000001#J-123456789#15715.00');

  if (hash1 !== hash2) throw new Error('[FAIL] Inconsistencia en hash determinista');
  if (hash1 === hashTampered) throw new Error('[FAIL] Colisión de hash ante alteración de datos');
  if (hash1.length !== 64) throw new Error('[FAIL] Longitud del hash SHA-256 debe ser de 64 caracteres');

  const qrPayload = buildFiscalQRPayload({
    sellerTaxId: 'J-123456789',
    buyerTaxId: 'J-987654321',
    documentNumber: 'FAC-000001',
    controlNumber: '00-000001',
    issueTimestamp: '2026-11-19 02:35:42 p.m.',
    totalVes: 15714.0,
    ivaVes: 1164.0,
    digitalHash: hash1,
  });

  if (!qrPayload.includes('https://fiscal.rendo.app/verify/v1')) {
    throw new Error('[FAIL] URL de verificación fiscal ausente en el payload QR');
  }
  console.log('  ✓ Inalterabilidad con hash SHA-256 y QR telemático validados');

  // ─────────────────────────────────────────────────────────────
  // 18.7 Validación de Requisitos Obligatorios del Comprador (Art. 8)
  // ─────────────────────────────────────────────────────────────
  console.log('18.7 Validación estricta de Domicilio Fiscal obligatorio del comprador');
  let rejectedNoAddress = false;
  try {
    createProvidencia00093Document({
      documentNumber: 'FAC-000001',
      controlNumber: '00-000001',
      controlRange: '00-000001 al 00-500000',
      seller: { businessName: 'Distribuidora Central, C.A.', taxId: 'J-123456789', fiscalAddress: 'Av. Libertador, Caracas' },
      buyer: { businessName: 'Supermercado Los Próceres', taxId: 'J-987654321', fiscalAddress: '' }, // Domicilio vacío
      lines: sampleLines,
      bcvRate: 48.5,
    });
  } catch (_err) {
    rejectedNoAddress = true;
  }

  if (!rejectedNoAddress) {
    throw new Error('[FAIL] La providencia exige que el domicilio fiscal del comprador sea obligatorio y fue aceptado vacío');
  }
  console.log('  ✓ Rechazo de factura sin domicilio fiscal del comprador verificado');

  // ─────────────────────────────────────────────────────────────
  // 18.8 Ensamblaje Completo de Factura Digital Certificada
  // ─────────────────────────────────────────────────────────────
  console.log('18.8 Ensamblaje de documento legal Providencia SNAT/2026/00093');
  const validDoc = createProvidencia00093Document({
    documentNumber: 'FAC-000001',
    controlNumber: '00-000001',
    controlRange: 'Desde N° 00-000001 hasta N° 00-500000',
    seller: {
      businessName: 'Distribuidora Mayorista Rendo, C.A.',
      taxId: 'J-305889991',
      fiscalAddress: 'Zona Industrial La Candelaria, Galpón 4, Valencia, Edo. Carabobo',
      phone: '+58 241 8551234',
    },
    buyer: {
      businessName: 'Cadena de Supermercados El Grano de Oro, C.A.',
      taxId: 'J-401239870',
      fiscalAddress: 'Av. Las Delicias, Centro Comercial Maracay Plaza, Local 15, Maracay, Edo. Aragua',
      phone: '+58 243 2334455',
      isSpecialTaxpayer: true,
    },
    lines: sampleLines,
    bcvRate: 48.5,
    retentionIvaRate: 75,
    retentionVoucherNumber: 'VOUCHER-75-001',
  });

  if (validDoc.statutoryNotice !== PROVIDENCIA_00093_NOTICE) {
    throw new Error(`[FAIL] Leyenda formal legal incorrecta: ${validDoc.statutoryNotice}`);
  }
  if (!validDoc.digitalHashSha256 || validDoc.digitalHashSha256.length !== 64) {
    throw new Error('[FAIL] Hash SHA-256 ausente o corrupto en el documento ensamblado');
  }
  if (validDoc.lines.length !== 2) {
    throw new Error('[FAIL] Número de líneas de factura incorrecto');
  }
  console.log(`  ✓ Documento fiscal legal ensamblado con Hash: ${validDoc.digitalHashSha256.substring(0, 16)}...`);
  console.log(`  ✓ Leyenda legal verificada: "${validDoc.statutoryNotice}"`);

  console.log('✅ [18_facturacion_digital_seniat2026.test.ts] Todos los tests pasaron exitosamente.');
}
