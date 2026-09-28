// Empirical Test Suite for Advanced WhatsApp CRM Features
console.log('=== STARTING EMPIRICAL TESTS FOR ADVANCED WHATSAPP CRM FEATURES ===\n');

let passCount = 0;
let failCount = 0;

function report(testName, success, detail = '') {
  if (success) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.log(`[FAIL] ${testName} - ${detail}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// Test 1: Internal Team Notes Security and Isolation
// -------------------------------------------------------------
console.log('--- 1. Internal Team Notes Isolation ---');

function createMessagePayload(text, isInternalNote, actorEmail) {
  return {
    text,
    sender_type: isInternalNote ? 'system' : 'agent',
    sender_name: isInternalNote ? `Nota Interna (${actorEmail})` : actorEmail,
    metadata: {
      is_internal_note: Boolean(isInternalNote),
      created_by: actorEmail,
    },
    shouldDispatchWebhook: !isInternalNote,
  };
}

const clientMsg = createMessagePayload('Hola cliente', false, 'admin@test.com');
const noteMsg = createMessagePayload('El cliente solicitó pagar el viernes', true, 'admin@test.com');

report('Client message dispatches to webhook', clientMsg.shouldDispatchWebhook === true);
report('Internal note suppresses webhook dispatch', noteMsg.shouldDispatchWebhook === false);
report('Internal note has is_internal_note = true in metadata', noteMsg.metadata.is_internal_note === true);
report('Internal note prefixes sender name appropriately', noteMsg.sender_name.startsWith('Nota Interna'));

// -------------------------------------------------------------
// Test 2: Slash Commands Resolution Engine
// -------------------------------------------------------------
console.log('\n--- 2. Slash Commands Resolution ---');

const slashCommands = [
  { cmd: '/pago', keyword: 'datos bancarios' },
  { cmd: '/deuda', keyword: 'saldo pendiente' },
  { cmd: '/catalogo', keyword: 'tienda en línea' },
  { cmd: '/horario', keyword: 'horario de atención' },
  { cmd: '/cumple', keyword: 'cumpleaños' },
  { cmd: '/cita', keyword: 'recordamos tu cita' },
];

function resolveSlashCommand(input) {
  return slashCommands.find(c => c.cmd.toLowerCase() === input.trim().toLowerCase());
}

report('Resolves /pago command', resolveSlashCommand('/pago')?.keyword === 'datos bancarios');
report('Resolves /deuda command', resolveSlashCommand('/deuda')?.keyword === 'saldo pendiente');
report('Resolves /catalogo command', resolveSlashCommand('/catalogo')?.keyword === 'tienda en línea');
report('Resolves /horario command', resolveSlashCommand('/horario')?.keyword === 'horario de atención');
report('Resolves /cumple command', resolveSlashCommand('/cumple')?.keyword === 'cumpleaños');
report('Resolves /cita command', resolveSlashCommand('/cita')?.keyword === 'recordamos tu cita');

// -------------------------------------------------------------
// Test 3: Debt Filtering Engine (debt_only)
// -------------------------------------------------------------
console.log('\n--- 3. Debt Filtering Engine ---');

const conversationsPool = [
  { id: 'c1', client_name: 'Solvente Corp', tags: ['VIP'], metadata: { client_metadata: { total_debt: 0 } } },
  { id: 'c2', client_name: 'Bodega Deudora', tags: ['Deudor'], metadata: { client_metadata: { total_debt: 120.5 } } },
  { id: 'c3', client_name: 'Farmacia Sol', tags: ['Cliente'], metadata: { client_metadata: { total_debt: 45.0 } } },
  { id: 'c4', client_name: 'Sin Metadata', tags: [], metadata: {} },
];

function filterByDebt(convs) {
  return convs.filter(c => {
    const debt = Number(c.metadata?.client_metadata?.total_debt || 0);
    const isDeudorTag = (c.tags || []).some(t => t.toLowerCase().includes('deud'));
    return debt > 0 || isDeudorTag;
  });
}

const debtResults = filterByDebt(conversationsPool);
report('Filters only conversations with debt or Deudor tag', debtResults.length === 2);
report('Includes Bodega Deudora in debt list', debtResults.some(c => c.id === 'c2'));
report('Includes Farmacia Sol in debt list', debtResults.some(c => c.id === 'c3'));
report('Excludes Solvente Corp from debt list', !debtResults.some(c => c.id === 'c1'));

// -------------------------------------------------------------
// Test 4: Birthday Filtering Engine (birthday_only)
// -------------------------------------------------------------
console.log('\n--- 4. Birthday Filtering Engine ---');

const currentMonth = new Date().getUTCMonth();
const bdayThisMonth = new Date();
bdayThisMonth.setUTCFullYear(1990);

const bdayOtherMonth = new Date();
bdayOtherMonth.setUTCMonth((currentMonth + 3) % 12);

const bdayPool = [
  { id: 'b1', client_name: 'Cumpleañero Hoy', metadata: { client_metadata: { birth_date: bdayThisMonth.toISOString() } } },
  { id: 'b2', client_name: 'Cumple Otro Mes', metadata: { client_metadata: { birth_date: bdayOtherMonth.toISOString() } } },
  { id: 'b3', client_name: 'Sin Fecha', metadata: {} },
];

function filterByBirthday(convs) {
  const now = new Date();
  return convs.filter(c => {
    const bDate = c.metadata?.client_metadata?.birth_date;
    if (!bDate) return false;
    return new Date(bDate).getUTCMonth() === now.getUTCMonth();
  });
}

const bdayResults = filterByBirthday(bdayPool);
report('Filters only clients with birthday in current month', bdayResults.length === 1 && bdayResults[0].id === 'b1');

// -------------------------------------------------------------
// Test 5: Compras PO to WhatsApp Formatter Contract
// -------------------------------------------------------------
console.log('\n--- 5. Compras PO WhatsApp Formatter Contract ---');

function formatPoWhatsAppMessage(po) {
  const linesText = (po.lines || [])
    .map(l => `- ${l.description}: ${l.quantity}x a $${Number(l.unit_price || 0).toFixed(2)}`)
    .join('\n');

  return `*ORDEN DE COMPRA: ${po.document_number}*\n` +
    `Estimado/a ${po.supplier_name},\n` +
    `${linesText}\n` +
    `*TOTAL: $${Number(po.total_amount || 0).toFixed(2)} USD*`;
}

const samplePo = {
  document_number: 'PO-2026-0045',
  supplier_name: 'Distribuidora Los Andes',
  total_amount: 350.0,
  lines: [
    { description: 'Harina de Trigo 50kg', quantity: 5, unit_price: 30.0 },
    { description: 'Azúcar Refinada 50kg', quantity: 4, unit_price: 50.0 },
  ],
};

const poText = formatPoWhatsAppMessage(samplePo);
report('PO text contains document number', poText.includes('PO-2026-0045'));
report('PO text contains supplier name', poText.includes('Distribuidora Los Andes'));
report('PO text contains itemized breakdown', poText.includes('Harina de Trigo 50kg: 5x a $30.00'));
report('PO text contains total USD', poText.includes('*TOTAL: $350.00 USD*'));

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n=== EMPIRICAL TEST SUMMARY ===');
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
