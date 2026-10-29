import assert from 'node:assert/strict';
import {
  MEDICAL_SPECIALTIES_LIST,
  MEDICAL_PROCEDURES_MASTER,
  mergeTenantMedicalServices,
} from '../lib/medical/specialtyRegistry';
import {
  calculateBMI,
  calculateMAP,
  calculateExactPediatricAge,
  calculatePediatricDosage,
  calculateObstetricWheel,
  calculateSphericalEquivalent,
  evaluateIOP,
} from '../lib/medical/clinicalCalculators';
import { isModuleActive } from '../lib/core/kernel/moduleRegistry';

export async function runRendoSaludTests() {
  console.log('\n--- 🩺 Módulo 12: Clínica Médica Multi-Especialidad (Rendo Salud) ---');

  // 1. Verificar registro de las 7 especialidades y procedimientos precargados
  console.log('12.1 Catálogo de 7 especialidades médicas y procedimientos con etapas');
  assert.equal(MEDICAL_SPECIALTIES_LIST.length, 7, 'Deben existir exactamente 7 especialidades médicas en el núcleo clínico');
  assert.ok(MEDICAL_PROCEDURES_MASTER.length >= 48, 'Deben existir al menos 48 procedimientos médicos precargados');

  for (const spec of MEDICAL_SPECIALTIES_LIST) {
    const procs = MEDICAL_PROCEDURES_MASTER.filter(p => p.specialtyId === spec.id);
    assert.ok(procs.length >= 7, `La especialidad ${spec.name} debe tener al menos 7 procedimientos`);
    assert.ok(spec.commonCie10.length >= 6, `La especialidad ${spec.name} debe tener códigos CIE-10`);
    assert.ok(spec.prescriptionTemplates.length >= 3, `La especialidad ${spec.name} debe tener plantillas de récipe`);
    for (const p of procs) {
      assert.ok(p.stages.length >= 1, `El procedimiento ${p.code} debe tener etapas clínicas definidas`);
    }
  }
  console.log('  ✓ 6 especialidades, CIE-10, plantillas de récipe y 48 procedimientos verificados');

  // 2. Verificar fusión de precios personalizados por empresa
  console.log('12.2 Fusión de precios personalizados por empresa y filtro por especialidad');
  const mergedPed = mergeTenantMedicalServices(
    [{ id: 'custom-ped-1', name: 'Consulta de Niño Sano y Control de Crecimiento (Puericultura)', base_price: 50, type: 'service' }],
    'med_pediatria'
  );
  const overridden = mergedPed.find(p => p.name.includes('Niño Sano'));
  assert.ok(overridden, 'Debe encontrarse la consulta de niño sano');
  assert.equal(overridden.defaultPriceUSD, 50, 'El precio personalizado de la clínica ($50) debe sobrescribir el precio base');
  console.log('  ✓ Fusión de baremos médicos por empresa verificada');

  // 3. Verificar calculadoras clínicas
  console.log('12.3 Calculadoras clínicas (IMC, PAM/AHA, Dosis Pediátrica, Gestograma, Oftalmología)');
  const bmiRes = calculateBMI(70, 175);
  assert.equal(bmiRes.bmi, 22.9);
  assert.equal(bmiRes.category, 'Normal');

  const mapNormal = calculateMAP(115, 75);
  assert.equal(mapNormal.ahaStage, 'Normal');

  const mapRes = calculateMAP(120, 80);
  assert.equal(mapRes.map, 93);
  assert.equal(mapRes.ahaStage, 'HTA Estadio 1');

  const crisisMap = calculateMAP(185, 125);
  assert.equal(crisisMap.ahaStage, 'Crisis Hipertensiva');
  assert.equal(crisisMap.alert, true);

  const pedAge = calculateExactPediatricAge('2024-01-10', new Date('2025-05-22T12:00:00Z'));
  assert.equal(pedAge.years, 1);
  assert.equal(pedAge.months, 4);

  const pedDose = calculatePediatricDosage(12, 60, 6, 160); // 12kg, 60mg/kg/día c/6h (4 tomas), jarabe 160mg/5mL
  assert.equal(pedDose.totalDailyMg, 720);
  assert.equal(pedDose.mgPerDose, 180);
  assert.equal(pedDose.mlPerDose, 5.6);

  const obWheel = calculateObstetricWheel('2026-01-01', new Date('2026-05-21T12:00:00Z'));
  assert.equal(obWheel.gestationalWeeks, 20);
  assert.equal(obWheel.trimester, 2);

  const se = calculateSphericalEquivalent(-2.0, -1.0);
  assert.equal(se, -2.5);

  const iopNormal = evaluateIOP(15, 16);
  assert.equal(iopNormal.hasAlert, false);
  const iopHigh = evaluateIOP(24, 16);
  assert.equal(iopHigh.hasAlert, true);
  console.log('  ✓ Todas las calculadoras médicas arrojan resultados exactos');

  // 4. Gobernanza independiente de sub-módulos en Rendo Hub (Odontología separada)
  console.log('12.4 Gobernanza de Sub-Módulos en Rendo Hub e independencia de Odontología');
  const onlyPediatricTenant = ['caja', 'clientes', 'med_pediatria'];
  assert.equal(isModuleActive(onlyPediatricTenant, 'clinica'), true, 'Activar med_pediatria habilita automáticamente el acceso a /clinica');
  assert.equal(isModuleActive(onlyPediatricTenant, 'med_pediatria'), true);
  assert.equal(isModuleActive(onlyPediatricTenant, 'med_ginecologia'), false, 'No debe habilitar especialidades no contratadas');
  assert.equal(isModuleActive(onlyPediatricTenant, 'odontologia'), false, 'Odontología se mantiene como módulo 100% independiente');
  console.log('  ✓ Gobernanza modular y separación de Odontología verificadas');

  console.log('✅ [12_rendo_salud.test.ts] Todos los tests pasaron exitosamente.');
}
