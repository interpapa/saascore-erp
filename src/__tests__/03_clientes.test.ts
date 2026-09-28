import assert from 'node:assert/strict';

export function sanitizeWhatsAppPhone(phone: string): { valid: boolean; formatted: string } {
  if (!phone || phone === 'Sin teléfono') return { valid: false, formatted: '' };
  let clean = phone.replace(/[^0-9]/g, '');

  if (clean.startsWith('0')) {
    clean = '58' + clean.slice(1);
  } else if (clean.length === 10 && (clean.startsWith('412') || clean.startsWith('414') || clean.startsWith('424') || clean.startsWith('416') || clean.startsWith('426'))) {
    clean = '58' + clean;
  }

  const isValid = clean.length >= 10 && clean.length <= 15;
  return { valid: isValid, formatted: clean };
}

export function validateNationalId(id: string): { valid: boolean; normalized: string; type: 'V' | 'J' | 'E' | 'G' | 'P' | 'OTHER' } {
  if (!id) return { valid: false, normalized: '', type: 'OTHER' };
  const trimmed = id.trim().toUpperCase().replace(/[-.\s]/g, '');
  const match = trimmed.match(/^([VJEGP])(\d{6,9})$/);

  if (match) {
    return { valid: true, normalized: `${match[1]}-${match[2]}`, type: match[1] as any };
  }

  if (/^\d{6,9}$/.test(trimmed)) {
    return { valid: true, normalized: `V-${trimmed}`, type: 'V' };
  }

  return { valid: false, normalized: trimmed, type: 'OTHER' };
}

export function applyDebtMovement(currentDebt: number, type: 'charge' | 'payment', amount: number): number {
  if (amount <= 0 || isNaN(amount)) throw new Error('El monto debe ser un número positivo.');
  const newDebt = type === 'charge' ? currentDebt + amount : currentDebt - amount;
  return Math.round(newDebt * 100) / 100;
}

export async function runClientesTests() {
  console.log('\n--- 👥 Módulo 03: Directorio CRM & Clientes ---');

  console.log('3.1 Saneamiento de WhatsApp (Venezuela & Internacional)');
  assert.equal(sanitizeWhatsAppPhone('0414-1234567').formatted, '584141234567');
  assert.equal(sanitizeWhatsAppPhone('0412 987 6543').formatted, '584129876543');
  assert.equal(sanitizeWhatsAppPhone('+58 424 555-0199').formatted, '584245550199');
  assert.equal(sanitizeWhatsAppPhone('+1 (305) 555-0123').formatted, '13055550123');
  assert.equal(sanitizeWhatsAppPhone('Sin teléfono').valid, false);
  console.log('  ✓ Normalización omnicanal de teléfonos WhatsApp verificada');

  console.log('3.2 Validación y normalización de RIF / Cédula fiscal');
  const cedula = validateNationalId('28.110.123');
  assert.equal(cedula.valid, true);
  assert.equal(cedula.normalized, 'V-28110123');

  const rifInvalido = validateNationalId('J-ABC-XYZ');
  assert.equal(rifInvalido.valid, false, 'RIF con caracteres no numéricos debe ser detectado');

  const rifValido = validateNationalId('J-31234567');
  assert.equal(rifValido.valid, true);
  assert.equal(rifValido.type, 'J');
  console.log('  ✓ Formato de Cédula y RIF venezolano verificado');

  console.log('3.3 Saldo de Deuda y Abonos en Cuenta de Cliente');
  let saldo = applyDebtMovement(0, 'charge', 150.00); // Tratamiento odontológico
  assert.equal(saldo, 150.00, 'Deuda inicial debe ser $150');

  saldo = applyDebtMovement(saldo, 'payment', 50.00);  // Abono en efectivo
  assert.equal(saldo, 100.00, 'Saldo remanente debe ser $100');

  saldo = applyDebtMovement(saldo, 'payment', 100.00); // Saldo total cancelado
  assert.equal(saldo, 0.00, 'Saldo debe quedar en cero ($0.00)');

  assert.throws(() => applyDebtMovement(saldo, 'payment', -20), /número positivo/);
  console.log('  ✓ Movimientos de saldo deudor y protección de importes negativos validados');

  console.log('✅ [03_clientes.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('03_clientes.test.ts')) {
  runClientesTests().catch(err => {
    console.error('❌ Error en tests de clientes:', err);
    process.exit(1);
  });
}
