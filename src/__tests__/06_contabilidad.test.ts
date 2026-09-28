import assert from 'node:assert/strict';
import { buildInvoiceJournalLines } from '../lib/core/accountingEngine';
import { Document } from '../lib/api/documents';

export async function runContabilidadTests() {
  console.log('\n--- 📊 Módulo 06: Contabilidad NIIF & Partida Doble ---');

  // Test 1: Venta Contado / Efectivo
  console.log('6.1 Asiento contable para Venta de Contado (Efectivo)');
  const cashInvoice: Document = {
    id: 'inv-cash-1',
    entity_id: 'cust-1',
    type: 'invoice',
    document_number: 'FAC-000101',
    status: 'invoiced',
    subtotal_amount: 100,
    tax_amount: 16,
    total_amount: 116,
    issue_date: new Date().toISOString(),
    due_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: { payment_method: 'cash_usd' }
  };

  const cashLines = buildInvoiceJournalLines(cashInvoice);
  const totalDebitCash = cashLines.reduce((acc, l) => acc + l.debit, 0);
  const totalCreditCash = cashLines.reduce((acc, l) => acc + l.credit, 0);
  assert.equal(Math.round(totalDebitCash * 100) / 100, Math.round(totalCreditCash * 100) / 100, 'Partida doble: Débitos deben ser iguales a Créditos');
  assert.equal(cashLines.find(l => l.account_code === '1.1.01.01')?.debit, 116, 'Debe debitar Caja Principal 1.1.01.01');
  console.log('  ✓ Venta en efectivo debita Caja y preserva partida doble');

  // Test 2: Venta Bancaria (Pago Móvil / Transferencia)
  console.log('6.2 Asiento contable para Venta Bancaria (Pago Móvil / Transferencia)');
  const bankInvoice: Document = {
    ...cashInvoice,
    id: 'inv-bank-1',
    metadata: { payment_method: 'pago_movil' }
  };
  const bankLines = buildInvoiceJournalLines(bankInvoice);
  assert.equal(bankLines.find(l => l.account_code === '1.1.01.02')?.debit, 116, 'Debe debitar Bancos 1.1.01.02');
  console.log('  ✓ Venta electrónica debita Bancos correctamente');

  // Test 3: Venta a Crédito
  console.log('6.3 Asiento contable para Venta a Crédito');
  const creditInvoice: Document = {
    ...cashInvoice,
    id: 'inv-credit-1',
    metadata: { payment_method: 'credit' }
  };
  const creditLines = buildInvoiceJournalLines(creditInvoice);
  assert.equal(creditLines.find(l => l.account_code === '1.1.02.01')?.debit, 116, 'Venta a crédito debe debitar Cuentas por Cobrar 1.1.02.01');
  console.log('  ✓ Venta a crédito debita Cuentas por Cobrar (AR)');

  // Test 4: Pago Mixto
  console.log('6.4 Asiento contable para Pago Mixto (Efectivo + Banco)');
  const mixedInvoice: Document = {
    ...cashInvoice,
    id: 'inv-mixed-1',
    metadata: {
      payment_method: 'mixed',
      payment_breakdown: { cash: 50, bank: 66 }
    }
  };
  const mixedLines = buildInvoiceJournalLines(mixedInvoice);
  assert.equal(mixedLines.find(l => l.account_code === '1.1.01.01')?.debit, 50, 'Caja debe recibir $50');
  assert.equal(mixedLines.find(l => l.account_code === '1.1.01.02')?.debit, 66, 'Banco debe recibir $66');
  const totalDebitMixed = mixedLines.reduce((acc, l) => acc + l.debit, 0);
  const totalCreditMixed = mixedLines.reduce((acc, l) => acc + l.credit, 0);
  assert.equal(totalDebitMixed, totalCreditMixed, 'Partida doble cuadrada en pago mixto');
  console.log('  ✓ Pago mixto desglosado con exactitud en asientos contables');

  console.log('✅ [06_contabilidad.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('06_contabilidad.test.ts')) {
  runContabilidadTests().catch(err => {
    console.error('❌ Error en tests de contabilidad:', err);
    process.exit(1);
  });
}
