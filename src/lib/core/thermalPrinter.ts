/**
 * Rendo - Motor de Impresión Térmica ESC/POS & Apertura de Gaveta (Drawer Kick)
 * 
 * Genera secuencias binarias estándar ESC/POS compatibles con impresoras térmicas
 * de 80mm y 58mm (Epson, Star Micronics, Xprinter, Bixolon, POS-58/80).
 * Soporta Web Serial API, Web Bluetooth y generación de buffers para impresión directa.
 */

import { SaleReceiptData } from '@/components/caja/ReceiptModal';

export interface EscPosOptions {
  paperWidth?: '80mm' | '58mm';
  openDrawer?: boolean;
  cutPaper?: boolean;
}

// Comandos de control ESC/POS estándar
const CMD = {
  INIT: [0x1b, 0x40], // ESC @ - Reset / Inicializar
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [0x1b, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [0x1b, 0x21, 0x20],
  DOUBLE_SIZE_ON: [0x1b, 0x21, 0x30], // Doble ancho y alto
  NORMAL_TEXT: [0x1b, 0x21, 0x00],
  FEED_3_LINES: [0x1b, 0x64, 0x03],
  FEED_5_LINES: [0x1b, 0x64, 0x05],
  PAPER_CUT_FULL: [0x1d, 0x56, 0x00],
  PAPER_CUT_PARTIAL: [0x1d, 0x56, 0x42, 0x00],
  DRAWER_KICK_PIN2: [0x1b, 0x70, 0x00, 0x19, 0xfa], // Pulso al solenoide de gaveta Pin 2
  DRAWER_KICK_PIN5: [0x1b, 0x70, 0x01, 0x19, 0xfa], // Pulso alternativo Pin 5
};

/**
 * Codifica una cadena de texto a ASCII simple para compatibilidad ESC/POS universal.
 */
function toAsciiBytes(text: string): number[] {
  // Reemplazar tildes y caracteres especiales con equivalentes ASCII estándar
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N');

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    bytes.push(code < 128 ? code : 0x20); // Espacio si excede ASCII
  }
  return bytes;
}

/**
 * Justifica dos cadenas de texto a los extremos de una línea de ancho fijo.
 * Ej: "Subtotal" y "$10.00" -> "Subtotal                    $10.00"
 */
function formatTwoColumns(left: string, right: string, width: number): string {
  const leftClean = left.trim();
  const rightClean = right.trim();
  const spacesNeeded = Math.max(1, width - leftClean.length - rightClean.length);
  return leftClean + ' '.repeat(spacesNeeded) + rightClean;
}

/**
 * Genera el buffer binario en formato ESC/POS para la venta indicada.
 */
export function generateEscPosBuffer(
  sale: SaleReceiptData,
  options: EscPosOptions = {}
): Uint8Array {
  const { paperWidth = '80mm', openDrawer = true, cutPaper = true } = options;
  const colWidth = paperWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(colWidth);

  const bytes: number[] = [];

  const addBytes = (...cmdArrays: (number[] | Uint8Array)[]) => {
    for (const arr of cmdArrays) {
      for (let i = 0; i < arr.length; i++) {
        bytes.push(arr[i]);
      }
    }
  };

  const addTextLine = (text: string) => {
    addBytes(toAsciiBytes(text + '\n'));
  };

  // 1. Inicializar impresora
  addBytes(CMD.INIT);

  // 2. Abrir gaveta de dinero si se solicita
  if (openDrawer) {
    addBytes(CMD.DRAWER_KICK_PIN2);
    addBytes(CMD.DRAWER_KICK_PIN5);
  }

  // 3. Encabezado / Datos de la Empresa
  addBytes(CMD.ALIGN_CENTER);
  addBytes(CMD.DOUBLE_SIZE_ON, CMD.BOLD_ON);
  addTextLine(sale.companyName || 'RENDO ERP');
  addBytes(CMD.NORMAL_TEXT, CMD.BOLD_OFF);

  if (sale.companyTaxId) addTextLine(`RIF/NIT: ${sale.companyTaxId}`);
  if (sale.companyAddress) addTextLine(sale.companyAddress);
  if (sale.companyPhone) addTextLine(`Tel: ${sale.companyPhone}`);

  addTextLine(divider);

  // 4. Tipo de Documento y Número
  addBytes(CMD.BOLD_ON);
  addTextLine(`${sale.docLabel.toUpperCase()} N° ${sale.documentNumber}`);
  addBytes(CMD.BOLD_OFF);

  const fechaStr = new Date(sale.createdAt).toLocaleDateString('es-VE') + ' ' + 
                   new Date(sale.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  addTextLine(`Fecha: ${fechaStr}`);
  addTextLine(`Atendido por: ${sale.cashier}`);

  addBytes(CMD.ALIGN_LEFT);
  addTextLine(divider);
  addTextLine(`CLIENTE: ${sale.customerName}`);
  if (sale.customerTaxId) addTextLine(`DOC/RIF: ${sale.customerTaxId}`);
  if (sale.customerPhone) addTextLine(`TEL: ${sale.customerPhone}`);
  addTextLine(divider);

  // 5. Tabla de Ítems
  addBytes(CMD.BOLD_ON);
  if (paperWidth === '58mm') {
    addTextLine('Cant  Descripcion         Total');
  } else {
    addTextLine('Cant   Descripcion                       Total');
  }
  addBytes(CMD.BOLD_OFF);
  addTextLine(divider);

  for (const item of sale.items) {
    const qtyStr = `${item.quantity}x`.padEnd(5);
    const priceStr = `$${item.total.toFixed(2)}`;
    const descWidth = colWidth - qtyStr.length - priceStr.length - 2;
    const shortDesc = item.description.length > descWidth 
      ? item.description.slice(0, descWidth) 
      : item.description.padEnd(descWidth);

    addTextLine(`${qtyStr} ${shortDesc} ${priceStr}`);
  }

  addTextLine(divider);

  // 6. Totales y Matemática Financiera
  addBytes(CMD.BOLD_ON);
  addTextLine(formatTwoColumns('Subtotal:', `$${sale.subtotal.toFixed(2)}`, colWidth));

  if (sale.taxAmount > 0) {
    addTextLine(formatTwoColumns('IVA:', `+$${sale.taxAmount.toFixed(2)}`, colWidth));
  }

  addBytes(CMD.DOUBLE_HEIGHT_ON);
  addTextLine(formatTwoColumns('TOTAL USD:', `$${sale.total.toFixed(2)}`, colWidth));
  addBytes(CMD.NORMAL_TEXT);

  addTextLine(formatTwoColumns('TOTAL BS:', `Bs. ${sale.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, colWidth));
  addBytes(CMD.BOLD_OFF);

  if (sale.rate > 0) {
    addTextLine(formatTwoColumns('Tasa BCV Oficial:', `Bs. ${sale.rate.toFixed(2)}`, colWidth));
  }

  addTextLine(divider);

  // 7. Método de Pago y Vuelto
  const methodMap: Record<string, string> = {
    cash_usd: 'Efectivo USD ($)',
    cash_ves: 'Efectivo Bolívares (Bs)',
    pago_movil: 'Pago Móvil',
    card: 'Tarjeta / Punto de Venta',
    transfer: 'Transferencia Bancaria',
    zelle: 'Zelle ($)',
    mixed: 'Pago Combinado / Mixto',
    credit: 'Venta a Crédito (Por Cobrar)',
    cash: 'Efectivo',
  };
  addTextLine(formatTwoColumns('Metodo Pago:', methodMap[sale.paymentMethod] || sale.paymentMethod, colWidth));

  if (sale.changeDueUSD && sale.changeDueUSD > 0) {
    addBytes(CMD.BOLD_ON);
    addTextLine(formatTwoColumns('Vuelto USD:', `$${sale.changeDueUSD.toFixed(2)}`, colWidth));
    addBytes(CMD.BOLD_OFF);
  }
  if (sale.changeDueVES && sale.changeDueVES > 0) {
    addBytes(CMD.BOLD_ON);
    addTextLine(formatTwoColumns('Vuelto VES:', `Bs. ${sale.changeDueVES.toFixed(2)}`, colWidth));
    addBytes(CMD.BOLD_OFF);
  }

  // 8. Mensaje de Despedida
  addTextLine(divider);
  addBytes(CMD.ALIGN_CENTER);
  addTextLine('Gracias por su compra!');
  addTextLine('Conserve este comprobante.');

  // 9. Alimentación y Corte de Papel
  addBytes(CMD.FEED_5_LINES);
  if (cutPaper) {
    addBytes(CMD.PAPER_CUT_PARTIAL);
  }

  return new Uint8Array(bytes);
}

/**
 * Envía directamente el buffer ESC/POS a una impresora conectada por Web Serial (USB-Serial).
 */
export async function printViaWebSerial(buffer: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Solo disponible en navegador.' };

  const nav = navigator as any;
  if (!nav.serial) {
    return {
      success: false,
      error: 'Tu navegador no soporta Web Serial API. Usa Google Chrome o Edge para impresión directa USB.'
    };
  }

  try {
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(buffer);
    writer.releaseLock();
    await port.close();
    return { success: true };
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: errorObj.message };
  }
}
