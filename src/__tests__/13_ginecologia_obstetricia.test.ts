/**
 * Suite 13: Módulo Dedicado de Ginecología & Obstetricia
 * 
 * Valida:
 * 1. Catálogo maestro de procedimientos gineco-obstétricos y etapas clínicas.
 * 2. Fusión dinámica de aranceles y servicios de la empresa.
 * 3. Rueda obstétrica y calculadora gestacional por FUM (Regla de Naegele).
 * 4. Fórmulas ginecológicas, CIE-10 y plantillas de récipe.
 * 5. Gobernanza modular en el Kernel (isModuleActive y alias med_ginecologia).
 */

import assert from 'node:assert/strict';
import { 
  GINECO_PROCEDURES_MASTER, 
  GINECO_CIE10_CATALOG, 
  GINECO_PRESCRIPTION_TEMPLATES, 
  mergeTenantGinecoServices 
} from '../lib/ginecologia/proceduresCatalog';
import { calculateObstetricWheel } from '../lib/medical/clinicalCalculators';
import { isModuleActive, MODULE_CATALOG } from '../lib/core/kernel/moduleRegistry';

export async function runGinecologiaObstetriciaTests() {
  console.log('\n--- 🤰 Módulo 13: Ginecología & Obstetricia Dedicado ---');

  // 13.1 Catálogo Maestro Ginecológico y Etapas
  console.log('13.1 Catálogo maestro de procedimientos y etapas clínicas');
  assert.ok(GINECO_PROCEDURES_MASTER.length >= 15, 'Debe contener al menos 15 procedimientos gineco-obstétricos maestros');

  const pap = GINECO_PROCEDURES_MASTER.find(p => p.code === 'GIN-04');
  assert.ok(pap, 'Debe existir el procedimiento Citología Cervical PAP');
  assert.strictEqual(pap.category, 'diagnostico');
  assert.ok(pap.stages.length >= 3, 'El PAP debe contar con al menos 3 etapas clínicas');

  const diu = GINECO_PROCEDURES_MASTER.find(p => p.code === 'GIN-11');
  assert.ok(diu, 'Debe existir la colocación de DIU');
  assert.strictEqual(diu.sessionsRequired, 2, 'La colocación de DIU debe requerir 2 sesiones (inserción y control al mes)');

  const doppler = GINECO_PROCEDURES_MASTER.find(p => p.code === 'GIN-02');
  assert.ok(doppler, 'Debe existir el control prenatal con Doppler');
  assert.strictEqual(doppler.category, 'obstetricia');

  console.log('  ✓ Catálogo maestro verificado con etapas clínicas');

  // 13.2 Fusión con servicios y tarifas de la empresa
  console.log('13.2 Fusión dinámica con catálogo de la clínica');
  const mockTenantItems = [
    {
      id: 'custom-item-1',
      name: 'Consulta Ginecológica Integral',
      type: 'service',
      base_price: 65.0, // precio personalizado
      metadata: { category: 'consulta', duration_minutes: 50 },
    },
    {
      id: 'custom-item-2',
      name: 'Eco 4D Emocional HD Live',
      type: 'service',
      base_price: 90.0,
      metadata: { specialty: 'ginecologia', category: 'obstetricia' },
    },
  ];

  const merged = mergeTenantGinecoServices(mockTenantItems as any[]);
  const overriddenConsulta = merged.find(p => p.name === 'Consulta Ginecológica Integral');
  assert.ok(overriddenConsulta, 'Debe encontrar la consulta fusionada');
  assert.strictEqual(overriddenConsulta.defaultPriceUSD, 65.0, 'El precio debe ser el personalizado ($65)');

  const customEco = merged.find(p => p.name === 'Eco 4D Emocional HD Live');
  assert.ok(customEco, 'Debe incluir el procedimiento personalizado de la clínica');
  assert.strictEqual(customEco.defaultPriceUSD, 90.0);

  console.log('  ✓ Fusión de aranceles y procedimientos nuevos verificada');

  // 13.3 Rueda Obstétrica y Calculadora Gestacional (Naegele)
  console.log('13.3 Rueda Obstétrica (Naegele) y progreso fetal');
  const now = new Date(2026, 9, 14);
  const fumDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 140);
  const y = fumDate.getFullYear();
  const m = String(fumDate.getMonth() + 1).padStart(2, '0');
  const d = String(fumDate.getDate()).padStart(2, '0');
  const fum20Weeks = `${y}-${m}-${d}`;

  const wheel = calculateObstetricWheel(fum20Weeks, now);
  assert.strictEqual(wheel.gestationalWeeks, 20, 'Debe calcular exactamente 20 semanas de gestación');
  assert.strictEqual(wheel.gestationalDays, 0, 'Debe calcular 0 días de exceso');
  assert.strictEqual(wheel.trimester, 2, '20 semanas corresponde al 2º Trimestre');
  assert.strictEqual(wheel.progressPercent, 50, '140 de 280 días equivale exactamente al 50% de progreso');
  assert.strictEqual(wheel.daysRemaining, 140, 'Faltan 140 días para la fecha probable de parto');

  console.log('  ✓ Calculadora gestacional verificada con exactitud matemática');

  // 13.4 Catálogo CIE-10 y Plantillas de Récipe
  console.log('13.4 CIE-10 Gineco-Obstétrico y plantillas de récipe');
  assert.ok(GINECO_CIE10_CATALOG.length >= 10, 'Debe contar con al menos 10 códigos CIE-10 ginecológicos');
  const preeclampsiaCie = GINECO_CIE10_CATALOG.find(c => c.code === 'O14.0');
  assert.ok(preeclampsiaCie, 'Debe incluir O14.0 Preeclampsia');

  assert.ok(GINECO_PRESCRIPTION_TEMPLATES.length >= 3, 'Debe incluir al menos 3 plantillas de récipe ginecológico');
  const prenatalTmpl = GINECO_PRESCRIPTION_TEMPLATES.find(t => t.id === 'temp-prenatal');
  assert.ok(prenatalTmpl && prenatalTmpl.labOrders && prenatalTmpl.labOrders.length > 0);

  console.log('  ✓ CIE-10 y plantillas clínicas validadas');

  // 13.5 Gobernanza en el Kernel
  console.log('13.5 Gobernanza modular y alias en el Kernel');
  assert.ok(MODULE_CATALOG['ginecologia'], 'ginecologia debe estar en MODULE_CATALOG');

  // isModuleActive debe responder true tanto por 'ginecologia' como por el alias 'med_ginecologia'
  assert.strictEqual(isModuleActive(['ginecologia'], 'ginecologia'), true);
  assert.strictEqual(isModuleActive(['med_ginecologia'], 'ginecologia'), true, 'Debe ser activo si tiene el alias med_ginecologia');
  assert.strictEqual(isModuleActive(['ginecologia'], 'med_ginecologia'), true, 'Debe ser activo para med_ginecologia si tiene ginecologia');
  assert.strictEqual(isModuleActive(['odontologia'], 'ginecologia'), false, 'No debe estar activo si la empresa solo tiene odontología');

  console.log('  ✓ Gobernanza modular y compatibilidad retroactiva verificadas');
  console.log('✅ [13_ginecologia_obstetricia.test.ts] Todos los tests pasaron exitosamente.');
}
