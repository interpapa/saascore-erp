// Test harness for filterConversations tag filtering logic (whatsapp.ts line 457)
const assert = require('assert');

function filterConversations(list, filter) {
  if (!filter) return list;
  return list.filter((c) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const nameMatch = c.client_name.toLowerCase().includes(q);
      const phoneMatch = c.client_phone.includes(q);
      if (!nameMatch && !phoneMatch) return false;
    }
    if (filter.tag_id && filter.tag_id !== 'all') {
      const hasTag = c.tags.some((t) => typeof t === 'string' ? t === filter.tag_id : (t?.id === filter.tag_id || t?.name === filter.tag_id));
      if (!hasTag) return false;
    }
    if (filter.unread_only && c.unread_count === 0) return false;
    return true;
  });
}

const testData = [
  {
    id: 'conv_1',
    client_name: 'Juan Perez',
    client_phone: '+123456789',
    tags: ['VIP', 'Cliente'],
    unread_count: 2
  },
  {
    id: 'conv_2',
    client_name: 'Maria Gomez',
    client_phone: '+987654321',
    tags: [{ id: 't_soporte', name: 'Soporte' }, { id: 't_lead', name: 'Lead' }],
    unread_count: 0
  },
  {
    id: 'conv_3',
    client_name: 'Carlos Ruiz',
    client_phone: '+1122334455',
    tags: ['Deudor', { id: 't_vip', name: 'VIP' }, null, undefined, 42],
    unread_count: 1
  },
  {
    id: 'conv_4',
    client_name: 'Ana Lopez',
    client_phone: '+5544332211',
    tags: [],
    unread_count: 0
  }
];

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    testsFailed++;
  }
}

// Test 1: String primitive tag filtering
runTest('Filter by string tag "VIP" (matches primitive string tag & object tag name)', () => {
  const result = filterConversations(testData, { tag_id: 'VIP' });
  assert.strictEqual(result.length, 2);
  assert.deepStrictEqual(result.map(c => c.id), ['conv_1', 'conv_3']);
});

runTest('Filter by string tag "Cliente" (matches primitive string tag)', () => {
  const result = filterConversations(testData, { tag_id: 'Cliente' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'conv_1');
});

// Test 2: Object tag filtering by ID and by Name
runTest('Filter by tag object ID "t_soporte"', () => {
  const result = filterConversations(testData, { tag_id: 't_soporte' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'conv_2');
});

runTest('Filter by tag object name "Soporte"', () => {
  const result = filterConversations(testData, { tag_id: 'Soporte' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'conv_2');
});

runTest('Filter by tag object ID "t_vip"', () => {
  const result = filterConversations(testData, { tag_id: 't_vip' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'conv_3');
});

// Test 3: Mixed tag array & robust edge handling (null, undefined, numbers)
runTest('Filter by primitive tag "Deudor" in mixed array containing null/undefined/number', () => {
  const result = filterConversations(testData, { tag_id: 'Deudor' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'conv_3');
});

// Test 4: Tag filter "all"
runTest('Filter tag_id = "all" returns all conversations', () => {
  const result = filterConversations(testData, { tag_id: 'all' });
  assert.strictEqual(result.length, 4);
});

// Test 5: Search & Tag combined
runTest('Filter by search "Juan" AND tag_id "VIP"', () => {
  const result = filterConversations(testData, { search: 'Juan', tag_id: 'VIP' });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'conv_1');
});

// Summary
console.log(`\nTest Execution Summary: ${testsPassed} passed, ${testsFailed} failed.`);
if (testsFailed > 0) process.exit(1);
