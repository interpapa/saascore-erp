import assert from 'node:assert/strict';
import { isSuperAdminEmail, isSuperAdminAuthUser } from '../lib/core/tenantSecurity';
import { isModuleActive, MODULE_CATALOG, ModuleId } from '../lib/core/kernel/moduleRegistry';

export async function runSeguridadTests() {
  console.log('\n--- 🛡️ Módulo 01: Seguridad & Aislamiento ---');

  // 1. Superadmin Whitelist
  console.log('1.1 Validación de Superadmin por Email');
  assert.equal(isSuperAdminEmail('interpapadavid2811@gmail.com'), true, 'El superadmin base debe ser autorizado');
  assert.equal(isSuperAdminEmail('INTERPAPADAVID2811@GMAIL.COM'), true, 'Debe ser insensible a mayúsculas');
  assert.equal(isSuperAdminEmail('intruso@empresa.com'), false, 'Email no autorizado debe ser rechazado');
  assert.equal(isSuperAdminEmail(''), false, 'Email vacío debe ser rechazado');
  assert.equal(isSuperAdminEmail(null), false, 'Null debe ser rechazado');
  assert.equal(isSuperAdminEmail(undefined), false, 'Undefined debe ser rechazado');
  console.log('  ✓ Whitelist de superadmin verificada');

  // 2. Superadmin por Claims / App Metadata (Soporte técnico)
  console.log('1.2 Bypass legítimo de Superadmin por Metadata / JWT Claims');
  assert.equal(isSuperAdminAuthUser({ email: 'interpapadavid2811@gmail.com' }), true);
  assert.equal(isSuperAdminAuthUser({ email: 'staff@rendo.app', app_metadata: { role: 'superadmin' } }), true);
  assert.equal(isSuperAdminAuthUser({ email: 'staff@rendo.app', app_metadata: { is_superadmin: true } }), true);
  assert.equal(isSuperAdminAuthUser({ email: 'staff@rendo.app', user_metadata: { role: 'superadmin' } }), true);
  assert.equal(isSuperAdminAuthUser({ email: 'usuario@tenant.com', app_metadata: { role: 'employee' } }), false);
  assert.equal(isSuperAdminAuthUser(null), false);
  console.log('  ✓ Claims y metadata de soporte técnico validados');

  // 3. Kernel de Módulos (Disponibilidad y Core Modules)
  console.log('1.3 Activación de módulos y protección de módulos Core');
  assert.equal(isModuleActive([], 'config'), true, 'Módulo config es Core y siempre debe estar activo');
  assert.equal(isModuleActive([], 'admin'), true, 'Módulo admin es Core y siempre debe estar activo');
  assert.equal(isModuleActive([], 'clientes'), true, 'Módulo clientes es Core y siempre debe estar activo');

  // 4. Módulos opcionales / marketplace
  const activeCustom: ModuleId[] = ['caja', 'catalogo', 'odontologia'];
  assert.equal(isModuleActive(activeCustom, 'odontologia'), true, 'Odontología debe estar activa si está en la lista');
  assert.equal(isModuleActive(activeCustom, 'franquicias'), false, 'Franquicias no debe estar activa si no fue contratada');
  assert.equal(isModuleActive(activeCustom, 'inventario'), true, 'Inventario y Catálogo son equivalentes en el kernel');
  console.log('  ✓ Módulos Odoo-style y equivalencias de catálogo validadas');

  console.log('✅ [01_seguridad.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('01_seguridad.test.ts')) {
  runSeguridadTests().catch(err => {
    console.error('❌ Error en tests de seguridad:', err);
    process.exit(1);
  });
}
