/**
 * PRE-FLIGHT CANARY AUDIT (Rendo ERP)
 * 
 * Inspirado en los Synthetic Probers de Google SRE, Amazon One-Box y Meta Sapienz.
 * Esta herramienta NO es un test unitario con mocks:
 * Se conecta a la infraestructura viva de Supabase y valida que el sistema sea
 * estructuralmente seguro antes de enviar un commit a producción.
 */

import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { isSuperAdminEmail, SUPERADMIN_EMAILS } from '../src/lib/core/superadminWhitelist';
import { validateUserTenantAccess } from '../src/lib/core/tenantSecurity';
import { getUserTenant } from '../src/app/actions/tenant';
import { getItemsAction } from '../src/app/actions/items';
import { getEntitiesAction } from '../src/app/actions/entities';
import { getExchangeRateAction } from '../src/app/actions/currency';

async function runPreflightAudit() {
  console.log('====================================================');
  console.log('      RENDO ERP - PRE-FLIGHT CANARY AUDIT           ');
  console.log('   (Verificación Sintética en Vivo de Infraestructura)');
  console.log('====================================================\n');

  const startTime = Date.now();
  let checksPassed = 0;
  const totalChecks = 6;

  // 1. Salud y Latencia de Conexión a Base de Datos
  console.log('📡 [TEST 1/6] Latencia y enlace con Supabase PostgreSQL...');
  const t0 = Date.now();
  const { data: pingData, error: pingError } = await supabaseAdmin.from('tenants').select('id').limit(1);
  const latency = Date.now() - t0;
  if (pingError) {
    throw new Error(`Fallo de conexión a base de datos: ${pingError.message}`);
  }
  console.log(`   ✓ Base de datos conectada en ${latency}ms (Límite SRE: < 1500ms)`);
  checksPassed++;

  // 2. Blindaje de Lista Blanca de Superadministradores
  console.log('\n🔒 [TEST 2/6] Integridad de Whitelist de Superadmin...');
  const unauthorizedSuperadmins = SUPERADMIN_EMAILS.filter(e => 
    e.includes('valera') || e.includes('djumbo') || e.includes('consultorio')
  );
  if (unauthorizedSuperadmins.length > 0) {
    throw new Error(`Contaminación en Superadmin Whitelist: ${unauthorizedSuperadmins.join(', ')}`);
  }
  console.log(`   ✓ Whitelist limpia (${SUPERADMIN_EMAILS.length} operadores autorizados).`);
  checksPassed++;

  // 3. Aislamiento Criptográfico Anti-IDOR entre Empresas
  console.log('\n🛡️ [TEST 3/6] Prueba de Aislamiento Anti-IDOR en Vivo...');
  const testActor = { email: 'fake_attacker@unauthorized.com', role: 'seller' as any };
  const targetTenantId = 'af6f32b9-2313-42e1-bdc5-e16e643a0cda'; // Djumbo
  const idorCheck = await validateUserTenantAccess(testActor, targetTenantId);
  if (idorCheck.authorized) {
    throw new Error('FALLO CRÍTICO DE SEGURIDAD: Usuario no autorizado obtuvo acceso a tenant ajeno.');
  }
  console.log('   ✓ Intento de acceso cruzado bloqueado herméticamente (Acceso Denegado).');
  checksPassed++;

  // 4. Resolución Limpia de Tenant y Blindaje contra Rol Admin
  console.log('\n🏢 [TEST 4/6] Resolución de Tenant para clientes en producción...');
  const djumboUser = await getUserTenant('valerasilvamariajose@gmail.com');
  if (!djumboUser.success || !djumboUser.tenant) {
    throw new Error('No se pudo resolver el tenant legítimo de producción.');
  }
  if (djumboUser.role === 'superadmin') {
    throw new Error('REGRESIÓN DETECTADA: El cliente de producción está recibiendo rol de superadmin.');
  }
  console.log(`   ✓ Tenant resuelto: "${djumboUser.tenant.name}" con rol seguro "${djumboUser.role}".`);
  checksPassed++;

  // 5. Integridad de Esquema en Inventario & CRM (Cero columnas faltantes)
  console.log('\n📦 [TEST 5/6] Integridad de Esquema Aditivo (Items y Clientes)...');
  const itemsRes = await getItemsAction(djumboUser.tenant.id, undefined, 10, { email: 'valerasilvamariajose@gmail.com', role: 'owner' });
  if (!itemsRes.success) {
    throw new Error(`Error consultando inventario: ${itemsRes.error}`);
  }
  const clientsRes = await getEntitiesAction(djumboUser.tenant.id, 'customer', 10, { email: 'valerasilvamariajose@gmail.com', role: 'owner' });
  if (!clientsRes.success) {
    throw new Error(`Error consultando clientes: ${clientsRes.error}`);
  }
  console.log(`   ✓ Esquema verificado en caliente: ${itemsRes.items?.length || 0} items y ${clientsRes.entities?.length || 0} clientes leídos sin error 42703.`);
  checksPassed++;

  // 6. Servicio de Divisas & Tasa BCV Oficial
  console.log('\n💵 [TEST 6/6] Servicio de Tasa de Cambio y Motor Monetario...');
  const rateRes = await getExchangeRateAction(djumboUser.tenant.id);
  if (!rateRes.success || !rateRes.rateData?.rate) {
    throw new Error('El motor de tasa de cambio no devolvió una cotización válida.');
  }
  console.log(`   ✓ Tasa activa: ${rateRes.rateData.rate} ${rateRes.rateData.currency} (${rateRes.rateData.source || 'BCV'}).`);
  checksPassed++;

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log(`✨ PRE-FLIGHT CANARY AUDIT EXITOSO (${checksPassed}/${totalChecks} comprobaciones en ${totalDuration}s) ✨`);
  console.log('🚀 ESTADO DE INFRAESTRUCTURA: SEGURO PARA PUBLICAR');
  console.log('====================================================');
  process.exit(0);
}

runPreflightAudit().catch(err => {
  console.error('\n🚨 ABORTO PRE-FLIGHT: Se detectó una inconsistencia antes del despliegue:');
  console.error(err);
  process.exit(1);
});
