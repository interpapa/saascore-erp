// Empirical Test Suite for WhatsApp CRM Sovereignty & Interoperability
console.log('=== STARTING EMPIRICAL TESTS FOR WHATSAPP CRM SOVEREIGNTY ===\n');

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
// Test 1: Phone Sanitization and International Formatting
// -------------------------------------------------------------
console.log('--- 1. Phone Sanitization Engine ---');

function sanitizeWhatsAppPhone(phone, defaultCountry = '58') {
  let clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = defaultCountry + clean.slice(1);
  } else if (
    clean.length === 10 &&
    (clean.startsWith('412') ||
      clean.startsWith('414') ||
      clean.startsWith('424') ||
      clean.startsWith('416') ||
      clean.startsWith('426'))
  ) {
    clean = defaultCountry + clean;
  }
  return clean;
}

report(
  'Normalizes 04141234567 to 584141234567',
  sanitizeWhatsAppPhone('04141234567') === '584141234567'
);
report(
  'Normalizes raw 10-digit 4129876543 to 584129876543',
  sanitizeWhatsAppPhone('4129876543') === '584129876543'
);
report(
  'Normalizes international formatted +58 (414) 123-4567 to 584141234567',
  sanitizeWhatsAppPhone('+58 (414) 123-4567') === '584141234567'
);
report(
  'Preserves other international numbers like Colombia +57 300 1234567',
  sanitizeWhatsAppPhone('+57 300 1234567') === '573001234567'
);

// -------------------------------------------------------------
// Test 2: Dynamic Template Interpolations
// -------------------------------------------------------------
console.log('\n--- 2. Dynamic Template Interpolations ---');

function interpolateTemplate(template, vars) {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
  }
  return result;
}

const rawTemplate =
  'Hola {{cliente}}, te informamos de {{empresa}} que tu saldo es de ${{deuda}} USD. Consulta el catalogo en {{catalogo}}.';
const rendered = interpolateTemplate(rawTemplate, {
  cliente: 'Carlos Mendoza',
  empresa: 'Rendo Store',
  deuda: '45.00',
  catalogo: 'https://app.rendo.com/c/rendo-store',
});

report(
  'Interpolates {{cliente}} and {{empresa}}',
  rendered.includes('Hola Carlos Mendoza') && rendered.includes('Rendo Store')
);
report('Interpolates {{deuda}} with proper decimals', rendered.includes('$45.00 USD'));
report(
  'Interpolates {{catalogo}} URL',
  rendered.includes('https://app.rendo.com/c/rendo-store')
);

// -------------------------------------------------------------
// Test 3: Free Number Sovereignty & Conversation Conversion
// -------------------------------------------------------------
console.log('\n--- 3. Sovereign Number Chat & CRM Conversion ---');

// Simulated free contact creation
const freeNumberConv = {
  id: 'conv-584149998877',
  tenant_id: 'tenant-test',
  client_id: null,
  client_name: '+584149998877',
  client_phone: '584149998877',
  unread_count: 0,
  last_message: null,
  tags: [],
  status: 'active',
};

report('Free conversation initializes without client_id', freeNumberConv.client_id === null);

// Conversion to CRM client
function convertToCustomer(conv, newClientData) {
  const customerEntity = {
    id: 'ent-' + Date.now(),
    tenant_id: conv.tenant_id,
    type: 'customer',
    name: newClientData.name,
    phone: conv.client_phone,
    email: newClientData.email || null,
  };

  const updatedConv = {
    ...conv,
    client_id: customerEntity.id,
    client_name: customerEntity.name,
    client_email: customerEntity.email,
  };

  return { customerEntity, updatedConv };
}

const conversionRes = convertToCustomer(freeNumberConv, {
  name: 'María Alejandra Gómez',
  email: 'maria@example.com',
});

report(
  'Converts free number to CRM customer with matching entity id',
  conversionRes.updatedConv.client_id === conversionRes.customerEntity.id &&
    conversionRes.updatedConv.client_name === 'María Alejandra Gómez'
);

// -------------------------------------------------------------
// Test 4: Conversation Filter & Status Tabs
// -------------------------------------------------------------
console.log('\n--- 4. Conversation Filter & Status Tabs ---');

const sampleConvs = [
  { id: '1', client_name: 'Ana Pérez', client_phone: '584141112233', status: 'active', tags: ['VIP'] },
  { id: '2', client_name: 'Bodegón Express', client_phone: '584124445566', status: 'archived', tags: ['Proveedor'] },
  { id: '3', client_name: 'Carlos Ruiz', client_phone: '584167778899', status: 'active', tags: ['Lead'] },
];

function filterConvs(list, filter) {
  return list.filter((c) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const nameMatch = c.client_name.toLowerCase().includes(q);
      const phoneMatch = c.client_phone.includes(q);
      if (!nameMatch && !phoneMatch) return false;
    }
    if (filter.tag_id && filter.tag_id !== 'all') {
      if (!c.tags.includes(filter.tag_id)) return false;
    }
    if (filter.status && filter.status !== 'all') {
      if (c.status !== filter.status) return false;
    }
    return true;
  });
}

report(
  'Filters active conversations',
  filterConvs(sampleConvs, { status: 'active' }).length === 2
);
report(
  'Filters archived conversations',
  filterConvs(sampleConvs, { status: 'archived' }).length === 1
);
report(
  'Searches by phone number fragment',
  filterConvs(sampleConvs, { search: '44455' }).length === 1 &&
    filterConvs(sampleConvs, { search: '44455' })[0].client_name === 'Bodegón Express'
);
report(
  'Filters by VIP tag',
  filterConvs(sampleConvs, { tag_id: 'VIP' }).length === 1
);

// -------------------------------------------------------------
// Test 5: Cross-Module POS Digital Ticket Dispatch Contract
// -------------------------------------------------------------
console.log('\n--- 5. Cross-Module POS Dispatch Contract ---');

function createPOSWhatsAppPayload(saleData) {
  const cleanPhone = sanitizeWhatsAppPhone(saleData.customerPhone || '04141234567');
  const text = `Comprobante ${saleData.documentNumber} por $${saleData.total.toFixed(2)} USD`;
  return {
    phone: cleanPhone,
    client_name: saleData.customerName,
    text,
    module_source: 'caja',
    metadata: {
      document_number: saleData.documentNumber,
      total_usd: saleData.total,
    },
  };
}

const sampleSale = {
  documentNumber: 'TICKET-0099',
  customerName: 'Pedro Infante',
  customerPhone: '04245551234',
  total: 25.5,
};

const payload = createPOSWhatsAppPayload(sampleSale);
report('POS WhatsApp payload has normalized phone', payload.phone === '584245551234');
report('POS WhatsApp payload includes module_source = caja', payload.module_source === 'caja');
report('POS WhatsApp payload includes document metadata', payload.metadata.document_number === 'TICKET-0099');

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
