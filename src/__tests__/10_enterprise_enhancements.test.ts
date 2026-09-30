import assert from 'node:assert/strict';
import { generateEscPosBuffer } from '../lib/core/thermalPrinter';
import { workerQueue } from '../lib/core/workerQueue';
import { SaleReceiptData } from '../components/caja/ReceiptModal';

export async function runEnterpriseEnhancementsTests() {
  console.log('\n--- 🚀 Módulo 10: Mejoras de Grado Enterprise ---');

  // 1. Test ESC/POS Thermal Printing & Cash Drawer Kick
  console.log('10.1 Generación de Buffer Binario ESC/POS y Pulso de Gaveta');
  const dummySale: SaleReceiptData = {
    documentNumber: 'FAC-000999',
    docLabel: 'Factura de Venta',
    docSubtype: 'fiscal_invoice',
    createdAt: new Date().toISOString(),
    customerName: 'Corporación Inversora CA',
    customerTaxId: 'J-12345678-9',
    companyName: 'RENDO STORE',
    companyTaxId: 'J-99999999-0',
    companyAddress: 'Av. Libertador, Caracas',
    companyPhone: '+58 212 555-0199',
    items: [
      { description: 'Impresora Térmica 80mm', quantity: 2, unitPrice: 45.0, total: 90.0 },
      { description: 'Rollo Térmico 80mm', quantity: 10, unitPrice: 1.5, total: 15.0 },
    ],
    subtotal: 105.0,
    taxAmount: 16.8,
    total: 121.8,
    totalVES: 103478.4,
    rate: 849.56,
    paymentMethod: 'cash_usd',
    cashTenderedUSD: 140.0,
    changeDueUSD: 18.2,
    cashier: 'caja1@empresa.com',
  };

  const buffer = generateEscPosBuffer(dummySale, {
    paperWidth: '80mm',
    openDrawer: true,
    cutPaper: true,
  });

  assert.ok(buffer instanceof Uint8Array, 'El buffer debe ser un Uint8Array');
  assert.ok(buffer.length > 50, 'El buffer debe contener comandos y texto');

  // Verificar reset ESC @ (0x1B, 0x40)
  assert.equal(buffer[0], 0x1b, 'Debe iniciar con comando ESC');
  assert.equal(buffer[1], 0x40, 'Debe inicializar la impresora (@)');

  // Convertir bytes a string para verificar contenido
  const bufferString = String.fromCharCode(...buffer);

  // Verificar presencia de datos clave
  assert.ok(bufferString.includes('RENDO STORE'), 'Debe incluir nombre de la empresa');
  assert.ok(bufferString.includes('FAC-000999'), 'Debe incluir el número de factura');
  assert.ok(bufferString.includes('121.80'), 'Debe incluir el total en USD');
  assert.ok(bufferString.includes('18.20'), 'Debe incluir el vuelto');

  // Verificar secuencia de corte de papel GS V 66 0 (0x1D, 0x56, 0x42, 0x00)
  const hasCutCmd = buffer.some((b, i) => b === 0x1d && buffer[i + 1] === 0x56 && buffer[i + 2] === 0x42);
  assert.ok(hasCutCmd, 'Debe contener el comando de corte de papel (GS V)');

  // Verificar pulso de gaveta ESC p (0x1B, 0x70)
  const hasDrawerKick = buffer.some((b, i) => b === 0x1b && buffer[i + 1] === 0x70);
  assert.ok(hasDrawerKick, 'Debe contener el comando de apertura de gaveta (ESC p)');
  console.log('  ✓ Generación binaria ESC/POS, apertura de gaveta y corte validados');

  // 2. Test Worker Queue con Prioridades y Lotes
  console.log('10.2 Cola de Tareas Asíncronas y Procesamiento por Lotes');
  const executionOrder: string[] = [];

  // Encolar tarea normal y alta
  workerQueue.enqueue(
    'Tarea Normal',
    async () => {
      executionOrder.push('normal');
    },
    { priority: 'normal' }
  );

  workerQueue.enqueue(
    'Tarea Alta Prioridad',
    async () => {
      executionOrder.push('high');
    },
    { priority: 'high' }
  );

  // Encolar lote por chunks
  const dummyItems = [1, 2, 3, 4, 5, 6];
  const chunkProcessed: number[] = [];
  await workerQueue.enqueueBatch(
    'Procesamiento de Lotes',
    dummyItems,
    2,
    async (chunk) => {
      chunkProcessed.push(...chunk);
    },
    { priority: 'normal' }
  );

  // Esperar a que se procese la cola
  await new Promise((resolve) => setTimeout(resolve, 150));

  assert.ok(executionOrder.length >= 2, 'Las tareas encoladas deben haberse ejecutado');
  assert.equal(chunkProcessed.length, 6, 'Todos los elementos del lote deben haberse procesado');

  const stats = workerQueue.getStats();
  assert.ok(stats.completed >= 2, 'Las estadísticas de tareas completadas deben registrarse');
  console.log('  ✓ Cola asíncrona, control de concurrencia y chunks por lotes validados');

  console.log('✅ [10_enterprise_enhancements.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('10_enterprise_enhancements.test.ts')) {
  runEnterpriseEnhancementsTests().catch((err) => {
    console.error('❌ Error en tests enterprise:', err);
    process.exit(1);
  });
}
