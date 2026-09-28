import assert from 'node:assert/strict';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PaymentBreakdown {
  cash?: number;
  bank?: number;
  credit?: number;
}

export function processCartCheckout(
  cart: CartItem[],
  taxRate: number,
  breakdown: PaymentBreakdown
) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const tax = Math.round(roundedSubtotal * taxRate * 100) / 100;
  const total = Math.round((roundedSubtotal + tax) * 100) / 100;

  const totalPaid = Math.round(((breakdown.cash || 0) + (breakdown.bank || 0) + (breakdown.credit || 0)) * 100) / 100;
  const change = Math.max(0, Math.round((totalPaid - total) * 100) / 100);
  const remaining = Math.max(0, Math.round((total - totalPaid) * 100) / 100);

  return {
    subtotal: roundedSubtotal,
    tax,
    total,
    totalPaid,
    change,
    remaining,
    isFullyPaid: remaining === 0,
  };
}

export function reconcileCashSession(
  initialAmount: number,
  cashInflows: number[],
  cashOutflows: number[],
  countedAmount: number
) {
  const totalIn = cashInflows.reduce((a, b) => a + b, 0);
  const totalOut = cashOutflows.reduce((a, b) => a + b, 0);
  const expectedAmount = Math.round((initialAmount + totalIn - totalOut) * 100) / 100;
  const difference = Math.round((countedAmount - expectedAmount) * 100) / 100;

  return {
    expectedAmount,
    countedAmount,
    difference,
    status: difference === 0 ? 'balanced' : difference > 0 ? 'surplus' : 'deficit',
  };
}

export async function runCajaTests() {
  console.log('\n--- 💵 Módulo 05: Caja POS & Arqueo ---');

  console.log('5.1 Checkout con IVA 16% y pago exacto');
  const cart: CartItem[] = [
    { id: '1', name: 'Consulta Odontológica', price: 40.00, quantity: 1 },
    { id: '2', name: 'Radiografía Periapical', price: 10.00, quantity: 2 },
  ];
  // Subtotal = 40 + 20 = 60. Tax (16%) = 9.60. Total = 69.60

  const res1 = processCartCheckout(cart, 0.16, { cash: 70.00 });
  assert.equal(res1.subtotal, 60.00);
  assert.equal(res1.tax, 9.60);
  assert.equal(res1.total, 69.60);
  assert.equal(res1.totalPaid, 70.00);
  assert.equal(res1.change, 0.40, 'El cambio a devolver debe ser $0.40');
  assert.equal(res1.isFullyPaid, true);
  console.log('  ✓ Venta en mostrador con cálculo de vuelto verificada');

  console.log('5.2 Pago mixto dividido (Efectivo + Pago Móvil)');
  const res2 = processCartCheckout(cart, 0.16, { cash: 30.00, bank: 39.60 });
  assert.equal(res2.total, 69.60);
  assert.equal(res2.totalPaid, 69.60);
  assert.equal(res2.change, 0.00);
  assert.equal(res2.remaining, 0.00);
  assert.equal(res2.isFullyPaid, true);
  console.log('  ✓ Pago mixto multidivisa/multimétodo validado');

  console.log('5.3 Arqueo y Cierre de Sesión de Caja (Sobrantes / Faltantes)');
  // Inicial: $100. Entradas en efectivo: $50, $30, $20 = +$100. Salidas (gastos menores): $15 = -$15.
  // Esperado: 100 + 100 - 15 = 185.
  const cierreExacto = reconcileCashSession(100, [50, 30, 20], [15], 185);
  assert.equal(cierreExacto.expectedAmount, 185.00);
  assert.equal(cierreExacto.difference, 0.00);
  assert.equal(cierreExacto.status, 'balanced');

  const cierreFaltante = reconcileCashSession(100, [50, 30, 20], [15], 180);
  assert.equal(cierreFaltante.difference, -5.00);
  assert.equal(cierreFaltante.status, 'deficit');
  console.log('  ✓ Arqueo de caja y detección de descuadre o faltante verificada');

  console.log('✅ [05_caja.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('05_caja.test.ts')) {
  runCajaTests().catch(err => {
    console.error('❌ Error en tests de caja:', err);
    process.exit(1);
  });
}
