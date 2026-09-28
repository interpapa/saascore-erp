import assert from 'node:assert/strict';
import { buildInvoiceJournalLines } from '../lib/core/accountingEngine';
import { isSuperAdminEmail, isSuperAdminAuthUser } from '../lib/core/tenantSecurity';
import { Document } from '../lib/api/documents';

async function runTests() {
  console.log('--- Iniciando Tests de Verificación 360 ---');

  // Test 1: isSuperAdminEmail
  console.log('Test 1: isSuperAdminEmail verification');
  assert.equal(isSuperAdminEmail('interpapadavid2811@gmail.com'), true, 'Default superadmin should be authorized');
  assert.equal(isSuperAdminEmail('INTERPAPADAVID2811@GMAIL.COM'), true, 'Case insensitive superadmin should be authorized');
  assert.equal(isSuperAdminEmail('hacker@evil.com'), false, 'Random email should be rejected');
  assert.equal(isSuperAdminEmail(''), false, 'Empty email should be rejected');
  assert.equal(isSuperAdminEmail(null), false, 'Null email should be rejected');
  assert.equal(isSuperAdminEmail(undefined), false, 'Undefined email should be rejected');
  console.log('✓ Test 1 passed!');

  // Test 1b: isSuperAdminAuthUser
  console.log('Test 1b: isSuperAdminAuthUser with Auth Metadata verification');
  assert.equal(isSuperAdminAuthUser({ email: 'interpapadavid2811@gmail.com' }), true, 'Email match superadmin');
  assert.equal(isSuperAdminAuthUser({ email: 'staff@company.com', app_metadata: { role: 'superadmin' } }), true, 'App metadata superadmin');
  assert.equal(isSuperAdminAuthUser({ email: 'staff@company.com', app_metadata: { is_superadmin: true } }), true, 'App metadata is_superadmin');
  assert.equal(isSuperAdminAuthUser({ email: 'staff@company.com', user_metadata: { role: 'superadmin' } }), true, 'User metadata superadmin');
  assert.equal(isSuperAdminAuthUser({ email: 'regular@user.com', app_metadata: { role: 'user' } }), false, 'Regular user rejected');
  assert.equal(isSuperAdminAuthUser(null), false, 'Null auth user rejected');
  console.log('✓ Test 1b passed!');

  // Test 2: buildInvoiceJournalLines - Contado / Efectivo
  console.log('Test 2: Accounting entry for Cash (Contado) sale');
  const cashInvoice: Document = {
    id: 'test-inv-cash-1',
    entity_id: 'cust-1',
    type: 'invoice',
    document_number: 'FAC-000001',
    status: 'invoiced',
    subtotal_amount: 100,
    tax_amount: 16,
    total_amount: 116,
    issue_date: new Date().toISOString(),
    due_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      payment_method: 'cash_usd'
    }
  };

  const cashLines = buildInvoiceJournalLines(cashInvoice);
  const cashDebits = cashLines.filter(l => l.debit > 0);
  assert.equal(cashDebits.length, 1, 'Should have exactly 1 debit line');
  assert.equal(cashDebits[0].account_code, '1.1.01.01', 'Cash sale must debit 1.1.01.01 (Caja Principal)');
  assert.equal(cashDebits[0].debit, 116, 'Debit must match invoice total');
  const arLines = cashLines.filter(l => l.account_code === '1.1.02.01');
  assert.equal(arLines.length, 0, 'Cash sale MUST NOT debit 1.1.02.01 (AR)');
  console.log('✓ Test 2 passed!');

  // Test 3: buildInvoiceJournalLines - Bancos (Pago Móvil / Tarjeta / Transferencia / Zelle / POS / Punto)
  console.log('Test 3: Accounting entry for Bank / Card / Transfer / Pago Movil sale');
  for (const method of ['pago_movil', 'pago movil', 'card', 'tarjeta', 'transfer', 'transferencia', 'zelle', 'pos', 'punto']) {
    const bankInvoice: Document = {
      id: `test-inv-bank-${method}`,
      entity_id: 'cust-1',
      type: 'invoice',
      document_number: 'FAC-000002',
      status: 'invoiced',
      subtotal_amount: 200,
      tax_amount: 0,
      total_amount: 200,
      issue_date: new Date().toISOString(),
      due_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        payment_method: method
      }
    };

    const bankLines = buildInvoiceJournalLines(bankInvoice);
    const bankDebits = bankLines.filter(l => l.debit > 0);
    assert.equal(bankDebits.length, 1, `Should have exactly 1 debit line for ${method}`);
    assert.equal(bankDebits[0].account_code, '1.1.01.02', `${method} must debit 1.1.01.02 (Bancos)`);
    assert.equal(bankDebits[0].debit, 200);
    const arLinesBank = bankLines.filter(l => l.account_code === '1.1.02.01');
    assert.equal(arLinesBank.length, 0, `${method} sale MUST NOT debit 1.1.02.01 (AR)`);
  }
  console.log('✓ Test 3 passed!');

  // Test 4: buildInvoiceJournalLines - Crédito
  console.log('Test 4: Accounting entry for Credit sale');
  const creditInvoice: Document = {
    id: 'test-inv-cred-1',
    entity_id: 'cust-1',
    type: 'invoice',
    document_number: 'FAC-000003',
    status: 'invoiced',
    subtotal_amount: 300,
    tax_amount: 48,
    total_amount: 348,
    issue_date: new Date().toISOString(),
    due_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      payment_method: 'credit'
    }
  };

  const creditLines = buildInvoiceJournalLines(creditInvoice);
  const creditDebits = creditLines.filter(l => l.debit > 0);
  assert.equal(creditDebits.length, 1, 'Should have exactly 1 debit line');
  assert.equal(creditDebits[0].account_code, '1.1.02.01', 'Credit sale must debit 1.1.02.01 (AR Clientes)');
  assert.equal(creditDebits[0].debit, 348);
  console.log('✓ Test 4 passed!');

  // Test 5: buildInvoiceJournalLines - Pago Mixto
  console.log('Test 5: Accounting entry for Mixed Payment sale');
  const mixedInvoice: Document = {
    id: 'test-inv-mix-1',
    entity_id: 'cust-1',
    type: 'invoice',
    document_number: 'FAC-000004',
    status: 'invoiced',
    subtotal_amount: 100,
    tax_amount: 0,
    total_amount: 100,
    issue_date: new Date().toISOString(),
    due_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      payment_method: 'mixed',
      payments: [
        { method: 'cash', amount: 40 },
        { method: 'card', amount: 35 },
        { method: 'credit', amount: 25 }
      ]
    }
  };

  const mixedLines = buildInvoiceJournalLines(mixedInvoice);
  const mixedCash = mixedLines.find(l => l.account_code === '1.1.01.01');
  const mixedBank = mixedLines.find(l => l.account_code === '1.1.01.02');
  const mixedAR = mixedLines.find(l => l.account_code === '1.1.02.01');

  assert.equal(mixedCash?.debit, 40, 'Cash part should debit 1.1.01.01');
  assert.equal(mixedBank?.debit, 35, 'Card part should debit 1.1.01.02');
  assert.equal(mixedAR?.debit, 25, 'Credit part should debit 1.1.02.01');

  const totalDebit = mixedLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = mixedLines.reduce((s, l) => s + l.credit, 0);
  assert.equal(totalDebit, 100, 'Total debit must match 100');
  assert.equal(totalCredit, 100, 'Total credit must match 100');
  console.log('✓ Test 5 passed!');

  // Test 6: Micro-rounding adjustment tolerance (0.01 cent difference)
  console.log('Test 6: Micro-rounding balance preservation');
  const roundingInvoice: Document = {
    id: 'test-inv-round-1',
    entity_id: 'cust-1',
    type: 'invoice',
    document_number: 'FAC-000005',
    status: 'invoiced',
    subtotal_amount: 99.99,
    tax_amount: 16.00,
    total_amount: 116.00, // 116.00 vs 115.99 credit lines
    issue_date: new Date().toISOString(),
    due_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      payment_method: 'cash'
    }
  };

  const roundLines = buildInvoiceJournalLines(roundingInvoice);
  const roundDebitTotal = roundLines.reduce((s, l) => s + l.debit, 0);
  const roundCreditTotal = roundLines.reduce((s, l) => s + l.credit, 0);
  assert.equal(roundDebitTotal, roundCreditTotal, 'Debits and Credits must balance exactly with rounding absorption');
  console.log('✓ Test 6 passed!');

  console.log('========================================');
  console.log(' TODOS LOS TESTS DE AUDITORÍA PASARON ');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test fallido:', err);
  process.exit(1);
});
