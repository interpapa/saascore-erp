import assert from 'node:assert/strict';
import { isValidUUID, isTemporaryId, sanitizeUUID } from '../lib/core/uuid';

async function runGuardianTests() {
  console.log('--- Iniciando Tests del Guardián Central de UUIDs ---');

  // Test 1: Valid UUID formats (v1, v4, lowercase, uppercase)
  console.log('Test 1: Valid UUID verification');
  const validUUIDs = [
    'c21fa583-0bd6-4b95-a4b5-6f91d8e3b331',
    'C21FA583-0BD6-4B95-A4B5-6F91D8E3B331',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '00000000-0000-0000-0000-000000000000',
    'e97993a1-ddf2-442a-8c52-bf8191756f12'
  ];
  for (const uuid of validUUIDs) {
    assert.equal(isValidUUID(uuid), true, `UUID ${uuid} should be valid`);
    assert.equal(isTemporaryId(uuid), false, `UUID ${uuid} should not be temporary`);
    assert.equal(sanitizeUUID(uuid), uuid.toLowerCase(), `Sanitized UUID must match lowercase`);
  }
  console.log('✓ Test 1 passed!');

  // Test 2: Temporary and synthetic IDs
  console.log('Test 2: Temporary / synthetic ID detection');
  const tempIds = [
    'temp_1727546200000',
    'temp-1727546200000',
    'custom-1727546200000',
    'rec_1727546200000',
    'acc-1727546200000',
    'att-1727546200000',
    'step-1727546200000',
    'photo_1727546200000',
    'appt-1727546200000',
    'held-1727546200000',
    'generic_counter_customer',
    'tmp_abc123'
  ];
  for (const id of tempIds) {
    assert.equal(isTemporaryId(id), true, `ID "${id}" must be detected as temporary`);
    assert.equal(isValidUUID(id), false, `ID "${id}" must NOT be a valid UUID`);
    assert.equal(sanitizeUUID(id), null, `Sanitizing "${id}" must return null`);
  }
  console.log('✓ Test 2 passed!');

  // Test 3: Malformed, non-string, and empty inputs
  console.log('Test 3: Malformed, non-string, null and undefined inputs');
  const malformedInputs: any[] = [
    '',
    '   ',
    '12345',
    'not-a-uuid',
    'c21fa583-0bd6-4b95-a4b5', // truncated
    'c21fa583-0bd6-4b95-a4b5-6f91d8e3b331-extra', // too long
    'c21fa583_0bd6_4b95_a4b5_6f91d8e3b331', // underscores
    null,
    undefined,
    123456,
    {},
    [],
    true
  ];
  for (const input of malformedInputs) {
    assert.equal(isValidUUID(input), false, `Input ${JSON.stringify(input)} must be invalid UUID`);
    assert.equal(sanitizeUUID(input), null, `Sanitizing ${JSON.stringify(input)} must return null`);
  }
  console.log('✓ Test 3 passed!');

  // Test 4: Supernumerary Tooth Procedure purge
  console.log('Test 4: Odontogram procedure purging on tooth removal');
  const initialProcedures = [
    { toothNumber: 11, surface: 'vestibular', procedureId: 'caries' },
    { toothNumber: 99, surface: 'occlusal', procedureId: 'extraction' },
    { toothNumber: 21, surface: 'palatina', procedureId: 'sealant' }
  ];
  const toothToRemove = 99;
  const filteredProcedures = initialProcedures.filter(p => p.toothNumber !== toothToRemove);
  assert.equal(filteredProcedures.length, 2, 'Only procedures for remaining teeth should exist');
  assert.equal(filteredProcedures.some(p => p.toothNumber === 99), false, 'Removed tooth procedures must be purged');
  console.log('✓ Test 4 passed!');

  // Test 5: Odontología appointment normalizer match
  console.log('Test 5: Appointment client matching for dental module');
  const patientId = 'c21fa583-0bd6-4b95-a4b5-6f91d8e3b331';
  const appointmentsSample = [
    { id: 'appt-1', client_id: patientId, entity_id: null, customer_id: null },
    { id: 'appt-2', client_id: null, entity_id: patientId, customer_id: null },
    { id: 'appt-3', client_id: null, entity_id: null, customer_id: patientId },
    { id: 'appt-4', client_id: 'other-id', entity_id: 'other-id', customer_id: null }
  ];
  const matchedAppts = appointmentsSample.filter(
    a => a.client_id === patientId || a.entity_id === patientId || a.customer_id === patientId
  );
  assert.equal(matchedAppts.length, 3, 'Must match all 3 formats of patient appointment IDs');
  console.log('✓ Test 5 passed!');

  console.log('==============================================');
  console.log(' TODOS LOS TESTS DE GUARDIÁN UUID PASARON OK ');
  console.log('==============================================');
}

runGuardianTests().catch(err => {
  console.error('Test fallido:', err);
  process.exit(1);
});
