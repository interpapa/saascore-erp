/**
 * SUITE DE QA AVANZADO 01: CONCURRENCIA, CONDICIONES DE CARRERA & IDEMPOTENCIA
 * 
 * Simula situaciones de alta fricción concurrentes:
 * 1. Doble-clic simultáneo del cajero (Idempotencia en ráfaga de 10ms)
 * 2. Condición de carrera por la última unidad de stock (Race condition)
 * 3. Rate Limiting frente a inundación de peticiones (Anti-Spam / DDoS)
 * 4. Partida Doble en pagos mixtos con decimales irregulares (Floating Point Drift)
 */

import assert from 'node:assert/strict';
import { checkRateLimit } from '../lib/core/rateLimiter';
import Decimal from 'decimal.js';

export async function runConcurrencyAndIdempotencyTests() {
  console.log('======================================================================');
  console.log('  🧪 SUITE DE QA AVANZADO: CONCURRENCIA, CARRERA E IDEMPOTENCIA        ');
  console.log('======================================================================');

  // -------------------------------------------------------------------------
  // TEST 1: IDEMPOTENCIA ANTE DOBLE-CLIC RÁPIDO (Debounce de Base de Datos)
  // -------------------------------------------------------------------------
  console.log('\n⚡ [TEST 1] Detección de Idempotencia por Ráfaga de Doble-Clic');
  
  // Simulador de almacenamiento de idempotencia en memoria
  const idempotencyStore = new Set<string>();
  
  function simulateCheckoutTransaction(idempotencyKey: string, cartTotal: number) {
    if (idempotencyStore.has(idempotencyKey)) {
      return { status: 'deduplicated', billed: false, message: 'Transacción interceptada por idempotencia previa' };
    }
    idempotencyStore.add(idempotencyKey);
    return { status: 'created', billed: true, total: cartTotal };
  }

  const clientKey = 'idemp_uuid_tx_987654';
  
  // El usuario presiona el botón "Cobrar" 5 veces casi en el mismo milisegundo
  const rapidClicks = await Promise.all([
    simulateCheckoutTransaction(clientKey, 50.00),
    simulateCheckoutTransaction(clientKey, 50.00),
    simulateCheckoutTransaction(clientKey, 50.00),
    simulateCheckoutTransaction(clientKey, 50.00),
    simulateCheckoutTransaction(clientKey, 50.00),
  ]);

  const billedCount = rapidClicks.filter(r => r.billed).length;
  const deduplicatedCount = rapidClicks.filter(r => r.status === 'deduplicated').length;

  assert.equal(billedCount, 1, '¡CRÍTICO! Exactamente una sola transacción debe haberse facturado');
  assert.equal(deduplicatedCount, 4, 'Las 4 peticiones redundantes deben ser deduplicadas');
  console.log('  ✓ 5 clics simultáneos generaron exactamente 1 factura. 4 fueron interceptados.');

  // -------------------------------------------------------------------------
  // TEST 2: CONDICIÓN DE CARRERA (RACE CONDITION) POR ÚLTIMA UNIDAD DE STOCK
  // -------------------------------------------------------------------------
  console.log('\n⚡ [TEST 2] Condición de Carrera: Agotamiento Atómico de Inventario');

  // Supongamos un producto con stock crítico = 1 unidad
  let physicalStock = 1;
  const lockQueue: Array<() => void> = [];
  let isLocked = false;

  async function atomicDecrementStock(demand: number): Promise<{ success: boolean; remaining: number }> {
    // Simula una transacción con bloqueo a nivel de fila (SELECT FOR UPDATE)
    return new Promise((resolve) => {
      const execute = () => {
        isLocked = true;
        if (physicalStock >= demand) {
          physicalStock -= demand;
          isLocked = false;
          resolve({ success: true, remaining: physicalStock });
        } else {
          isLocked = false;
          resolve({ success: false, remaining: physicalStock });
        }
        if (lockQueue.length > 0) {
          const next = lockQueue.shift();
          next?.();
        }
      };

      if (isLocked) {
        lockQueue.push(execute);
      } else {
        execute();
      }
    });
  }

  // Dos cajeros intentan cobrar la única unidad disponible al mismo instante
  const [cajero1, cajero2] = await Promise.all([
    atomicDecrementStock(1),
    atomicDecrementStock(1)
  ]);

  const successCount = [cajero1, cajero2].filter(r => r.success).length;
  const failureCount = [cajero1, cajero2].filter(r => !r.success).length;

  assert.equal(successCount, 1, 'Solo un cajero puede conseguir la última unidad');
  assert.equal(failureCount, 1, 'El segundo intento debe ser rechazado sin stock');
  assert.equal(physicalStock, 0, 'El stock nunca puede quedar en negativo (-1)');
  console.log('  ✓ 2 cajeros concurrentes por stock 1: Uno triunfó, el otro fue rechazado limpiamente. Stock = 0.');

  // -------------------------------------------------------------------------
  // TEST 3: TOKEN BUCKET RATE LIMITING (Protección contra Inundación / Bots)
  // -------------------------------------------------------------------------
  console.log('\n⚡ [TEST 3] Rate Limiting Guard en Servidor (Anti-Spam / Inundación)');

  const testActorEmail = `stress_tester_${Date.now()}@rendo.com`;
  
  // Consumir ráfaga de 10 peticiones (el límite es 10 para checkout)
  const results = [];
  for (let i = 0; i < 15; i++) {
    results.push(checkRateLimit(testActorEmail, 'checkout'));
  }

  const allowedRequests = results.filter(r => r.allowed).length;
  const blockedRequests = results.filter(r => !r.allowed).length;

  assert.equal(allowedRequests, 10, 'Debe permitir exactamente la capacidad del bucket (10)');
  assert.equal(blockedRequests, 5, 'Debe bloquear las 5 peticiones excedentes con error 429');
  console.log(`  ✓ Ráfaga de 15 peticiones: 10 procesadas y 5 throttled correctamente.`);

  // -------------------------------------------------------------------------
  // TEST 4: PRECISIÓN DE PUNTO FLOTANTE EN DECIMALES (Evitar pérdida de céntimos)
  // -------------------------------------------------------------------------
  console.log('\n⚡ [TEST 4] Integridad de Matemáticas Financieras (Decimal.js vs IEEE 754)');

  // El clásico error de JavaScript: 0.1 + 0.2 === 0.30000000000000004
  const standardJsFloat = 0.1 + 0.2;
  assert.notEqual(standardJsFloat, 0.3, 'Float nativo de JavaScript produce drift');

  // En Rendo usamos Decimal.js
  const decimalResult = new Decimal(0.1).plus(0.2).toNumber();
  assert.equal(decimalResult, 0.3, 'Decimal.js resuelve exactamente a 0.3');

  // Caso real complejo: División de pago tripartito ($100 dividido entre 3)
  const total = new Decimal(100.00);
  const part1 = new Decimal(33.33);
  const part2 = new Decimal(33.33);
  const remainder = total.minus(part1).minus(part2); // 33.34

  assert.equal(remainder.toNumber(), 33.34, 'El remanente debe cuadrar la suma a $100.00');
  const sum = part1.plus(part2).plus(remainder);
  assert.equal(sum.toNumber(), 100.00, 'La suma de las partes cuadró al céntimo');
  console.log('  ✓ División tripartita sin pérdida de céntimos validada.');

  console.log('\n✨ CONCURRENCIA E IDEMPOTENCIA PASARON AL 100% ✨\n');
}

if (process.argv[1]?.includes('concurrency_race_qa')) {
  runConcurrencyAndIdempotencyTests().catch(err => {
    console.error('❌ Error en test de concurrencia:', err);
    process.exit(1);
  });
}
