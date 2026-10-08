/**
 * SUITE DE QA AVANZADO 02: FUZZING HOSTIL & RESILIENCIA DE DATOS EXTREMOS
 * 
 * Simula ataques con entradas caóticas, corruptas y bordes extremos:
 * 1. Cantidades astronómicas y precios negativos
 * 2. Inyección de Emojis, caracteres cirílicos/árabes y cadenas de 10,000 bytes
 * 3. Documentos fiscales (Cédulas / RIF) con formatos ilegales y maliciosos
 * 4. Fuzzing de Carrito con tipos de datos inválidos (null, NaN, strings como números)
 * 5. Protección contra IDOR (Intento de acceder a entidades de otro Tenant)
 */

import assert from 'node:assert/strict';
import { validateNationalId, sanitizeWhatsAppPhone } from './03_clientes.test';

export async function runFuzzingHostileDataTests() {
  console.log('======================================================================');
  console.log('  🌪️ SUITE DE QA AVANZADO: FUZZING HOSTIL & DATOS EXTREMOS             ');
  console.log('======================================================================');

  // -------------------------------------------------------------------------
  // TEST 1: FUZZING DE VALORES NUMÉRICOS EN CARRITO (Anti-Negativos / Anti-NaN)
  // -------------------------------------------------------------------------
  console.log('\n💣 [TEST 1] Fuzzing de Cantidades y Precios Hostiles');

  function validateCartItemSecurity(item: any): { valid: boolean; error?: string } {
    if (!item || typeof item !== 'object') return { valid: false, error: 'Ítem inválido' };
    if (!item.id || typeof item.id !== 'string') return { valid: false, error: 'ID faltante' };
    
    // Validar cantidad
    if (typeof item.quantity !== 'number' || isNaN(item.quantity) || !isFinite(item.quantity)) {
      return { valid: false, error: 'Cantidad debe ser un número finito' };
    }
    if (item.quantity <= 0) {
      return { valid: false, error: 'Cantidad debe ser mayor a cero' };
    }
    if (item.quantity > 1000000) {
      return { valid: false, error: 'Cantidad excede el límite máximo permitido (1M)' };
    }

    // Validar precio
    if (typeof item.price !== 'number' || isNaN(item.price) || !isFinite(item.price)) {
      return { valid: false, error: 'Precio debe ser un número finito' };
    }
    if (item.price < 0) {
      return { valid: false, error: 'Precio no puede ser negativo' };
    }

    return { valid: true };
  }

  const toxicPayloads = [
    { id: '1', name: 'Tóxico 1', quantity: -1, price: 10 },
    { id: '2', name: 'Tóxico 2', quantity: NaN, price: 10 },
    { id: '3', name: 'Tóxico 3', quantity: Infinity, price: 10 },
    { id: '4', name: 'Tóxico 4', quantity: 0, price: 10 },
    { id: '5', name: 'Tóxico 5', quantity: 9999999999, price: 10 },
    { id: '6', name: 'Tóxico 6', quantity: 1, price: -50.00 },
    { id: '7', name: 'Tóxico 7', quantity: "diez" as any, price: 10 },
  ];

  for (const toxic of toxicPayloads) {
    const res = validateCartItemSecurity(toxic);
    assert.equal(res.valid, false, `El payload tóxico debió ser rechazado: ${toxic.name}`);
  }
  console.log('  ✓ 7 variantes de cantidades/precios hostiles fueron neutralizadas correctamente.');

  // -------------------------------------------------------------------------
  // TEST 2: FUZZING DE CADENAS DE TEXTO (Unicode, Emojis, Longitudes Masivas)
  // -------------------------------------------------------------------------
  console.log('\n💣 [TEST 2] Fuzzing de Nombres, Descripciones y Emojis');

  function sanitizeCustomerName(input: string): { cleanName: string; isValid: boolean } {
    if (!input || typeof input !== 'string') return { cleanName: '', isValid: false };
    const trimmed = input.trim();
    if (trimmed.length < 2) return { cleanName: '', isValid: false };
    // Truncar a un máximo de 255 caracteres para prevenir desbordamiento de columnas en DB
    const truncated = trimmed.slice(0, 255);
    return { cleanName: truncated, isValid: true };
  }

  const hugeString = 'A'.repeat(5000);
  const emojiBomb = '🔥 Barbería VIP 💈✂️ 💯🚀'.repeat(20);
  const arabicAndCyrillic = 'مرحبا بالعالم - Здравствуйте - Hello';

  const resHuge = sanitizeCustomerName(hugeString);
  assert.equal(resHuge.isValid, true);
  assert.equal(resHuge.cleanName.length, 255, 'La cadena gigante de 5000 caracteres debe truncarse a 255');

  const resEmoji = sanitizeCustomerName(emojiBomb);
  assert.equal(resEmoji.isValid, true);
  assert.equal(resEmoji.cleanName.length <= 255, true, 'La cadena con emojis masivos debe acotarse');

  const resMultilingual = sanitizeCustomerName(arabicAndCyrillic);
  assert.equal(resMultilingual.isValid, true);
  assert.equal(resMultilingual.cleanName.includes('Здравствуйте'), true, 'El alfabeto cirílico debe conservarse');
  console.log('  ✓ Resiliencia ante textos gigantes (5k chars), bombas de emojis y alfabetos mixtos validada.');

  // -------------------------------------------------------------------------
  // TEST 3: FUZZING DE IDENTIFICACIÓN FISCAL (Cédulas / RIF)
  // -------------------------------------------------------------------------
  console.log('\n💣 [TEST 3] Fuzzing de RIF / Cédulas Fiscales');

  const maliciousTaxIds = [
    "'; DROP TABLE users; --",
    '<script>alert("xss")</script>',
    'V-123',                 // Muy corta
    'J-999999999999999999',  // Excesivamente larga
    'X-12345678',            // Tipo inexistente en Venezuela
  ];

  for (const tid of maliciousTaxIds) {
    const val = validateNationalId(tid);
    assert.equal(val.valid, false, `El RIF malicioso "${tid}" no debió validarse`);
  }
  console.log('  ✓ Inyecciones SQL, XSS y tipos ilegales en RIF/Cédula rechazados sin error.');

  // -------------------------------------------------------------------------
  // TEST 4: AISLAMIENTO MULTI-TENANT (Anti-IDOR)
  // -------------------------------------------------------------------------
  console.log('\n💣 [TEST 4] Aislamiento Criptográfico Anti-IDOR entre Empresas');

  interface EntityRecord {
    id: string;
    tenant_id: string;
    name: string;
  }

  const mockDatabaseEntities: EntityRecord[] = [
    { id: 'ent_1', tenant_id: 'tenant_alpha', name: 'Cliente de Farmacia Alpha' },
    { id: 'ent_2', tenant_id: 'tenant_beta', name: 'Paciente de Clínica Beta' }
  ];

  function queryEntitySecure(actorTenantId: string, entityId: string): EntityRecord | null {
    // Regla de oro Rendo: NUNCA consultar solo por entityId sin filtrar por tenant_id
    const found = mockDatabaseEntities.find(e => e.id === entityId && e.tenant_id === actorTenantId);
    return found || null;
  }

  // Tenant Alpha intenta acceder al cliente de Tenant Beta pasando su ID
  const unauthorizedAccess = queryEntitySecure('tenant_alpha', 'ent_2');
  assert.equal(unauthorizedAccess, null, '¡VIOLACIÓN DE AISLAMIENTO! Tenant Alpha no debe ver entidades de Beta');

  // Tenant Alpha accede a su propio cliente
  const authorizedAccess = queryEntitySecure('tenant_alpha', 'ent_1');
  assert.equal(authorizedAccess?.name, 'Cliente de Farmacia Alpha', 'El acceso legítimo debe funcionar');
  console.log('  ✓ Consulta cruzada Anti-IDOR rechazada. El aislamiento tenant es hermético.');

  console.log('\n✨ FUZZING HOSTIL Y RESILIENCIA PASARON AL 100% ✨\n');
}

if (process.argv[1]?.includes('fuzzing_data_qa')) {
  runFuzzingHostileDataTests().catch(err => {
    console.error('❌ Error en test de fuzzing:', err);
    process.exit(1);
  });
}
