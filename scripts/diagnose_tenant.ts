/**
 * Rendo ERP - Escáner de Diagnóstico Forense 360° para Tenants y Clientes
 * 
 * Uso:
 *   npx tsx --env-file=.env.local scripts/diagnose_tenant.ts <nombre_o_uuid_o_email>
 * Ejemplo:
 *   npx tsx --env-file=.env.local scripts/diagnose_tenant.ts djumbo
 */

import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { isSuperAdminEmail } from '../src/lib/core/superadminWhitelist';

interface DiagnosticReport {
  timestamp: string;
  query: string;
  tenantFound: boolean;
  tenant?: {
    id: string;
    name: string;
    is_active: boolean;
    currency: string;
    active_modules: string[];
    metadata: Record<string, unknown>;
  };
  users: Array<{
    email: string;
    role: string;
    isSuperadminWhitelist: boolean;
    authMetadataRole?: string;
  }>;
  counts: {
    customers: number;
    suppliers: number;
    employees: number;
    products: number;
    services: number;
    totalStockUnits: number;
    documents: number;
    appointments: number;
    openCashSessions: number;
  };
  samples: {
    customers: string[];
    products: string[];
  };
  anomaliesDetected: string[];
  verdict: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  recommendations: string[];
}

async function runTenantDiagnostic(queryArg: string) {
  const query = (queryArg || '').trim().toLowerCase();
  console.log('======================================================================');
  console.log(`🔍 ESCÁNER DE DIAGNÓSTICO FORENSE RENDO ERP: "${query}"`);
  console.log('======================================================================\n');

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    query,
    tenantFound: false,
    users: [],
    counts: {
      customers: 0,
      suppliers: 0,
      employees: 0,
      products: 0,
      services: 0,
      totalStockUnits: 0,
      documents: 0,
      appointments: 0,
      openCashSessions: 0,
    },
    samples: {
      customers: [],
      products: [],
    },
    anomaliesDetected: [],
    verdict: 'HEALTHY',
    recommendations: [],
  };

  // 1. Buscar Tenant por UUID, nombre o slug
  let tenant: any = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

  if (isUuid) {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('id, name, is_active, currency, active_modules, metadata')
      .eq('id', query)
      .maybeSingle();
    tenant = data;
  } else {
    // 1. Buscar directamente por nombre en PostgreSQL
    const { data: byName } = await supabaseAdmin
      .from('tenants')
      .select('id, name, is_active, currency, active_modules, metadata')
      .ilike('name', `%${query}%`)
      .limit(1)
      .maybeSingle();
    tenant = byName;

    // 2. Si no hubo match, buscar por email en user_tenants
    if (!tenant) {
      const { data: utMatch } = await supabaseAdmin
        .from('user_tenants')
        .select('tenant_id')
        .ilike('user_email', `%${query}%`)
        .limit(1)
        .maybeSingle();

      if (utMatch?.tenant_id) {
        const { data: byUt } = await supabaseAdmin
          .from('tenants')
          .select('id, name, is_active, currency, active_modules, metadata')
          .eq('id', utMatch.tenant_id)
          .maybeSingle();
        tenant = byUt;
      }
    }
  }

  if (!tenant) {
    report.anomaliesDetected.push(`No se encontró ningún tenant que coincida con "${query}".`);
    report.verdict = 'CRITICAL';
    report.recommendations.push('Verificar si el tenant fue creado con otro nombre o si el email de registro es diferente.');
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  report.tenantFound = true;
  report.tenant = {
    id: tenant.id,
    name: tenant.name,
    is_active: tenant.is_active,
    currency: tenant.currency || 'USD',
    active_modules: tenant.active_modules || [],
    metadata: tenant.metadata || {},
  };

  console.log(`🏢 Empresa Localizada: [${tenant.id}] "${tenant.name}"`);
  console.log(`   Estado: ${tenant.is_active ? '✅ Activo' : '❌ Bloqueado'} | Moneda: ${tenant.currency}`);
  console.log(`   Módulos Activos (${tenant.active_modules?.length || 0}):`, (tenant.active_modules || []).join(', '));

  // 2. Diagnosticar Usuarios y Membresías
  const { data: utRows } = await supabaseAdmin
    .from('user_tenants')
    .select('*')
    .eq('tenant_id', tenant.id);

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

  console.log(`\n👥 Usuarios Vinculados (${utRows?.length || 0}):`);
  for (const ut of utRows || []) {
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === ut.user_email?.toLowerCase());
    const isSuper = isSuperAdminEmail(ut.user_email);
    const authMeta = authUser?.user_metadata || {};

    report.users.push({
      email: ut.user_email,
      role: ut.role,
      isSuperadminWhitelist: isSuper,
      authMetadataRole: authMeta.role,
    });

    console.log(`   - ${ut.user_email} | Rol en tenant: "${ut.role}" | ¿Superadmin Whitelist?: ${isSuper ? '⚠️ SÍ (Atención)' : 'No'}`);
    
    // Alerta de anomalía: Si el usuario es dueño de este negocio pero está en whitelist de superadmin
    if (isSuper && ut.user_email !== 'interpapadavid2811@gmail.com' && ut.user_email !== '1@gmail.com') {
      report.anomaliesDetected.push(
        `El usuario ${ut.user_email} está en DEFAULT_SUPERADMINS. Esto puede secuestrar su sesión con impersonaciones globales de Rendo Corp.`
      );
      report.recommendations.push(
        `Remover ${ut.user_email} de superadminWhitelist.ts y ajustar su user_metadata a { role: 'owner' }.`
      );
    }
  }

  // 3. Diagnosticar Clientes y Entidades
  const { data: entities } = await supabaseAdmin
    .from('entities')
    .select('id, name, type, status, deleted_at')
    .eq('tenant_id', tenant.id);

  const activeEntities = entities?.filter(e => !e.deleted_at) || [];
  report.counts.customers = activeEntities.filter(e => e.type === 'customer').length;
  report.counts.suppliers = activeEntities.filter(e => e.type === 'supplier').length;
  report.counts.employees = activeEntities.filter(e => e.type === 'employee').length;

  report.samples.customers = activeEntities
    .filter(e => e.type === 'customer')
    .map(e => e.name)
    .slice(0, 5);

  console.log(`\n📋 Entidades en Base de Datos:`);
  console.log(`   - Clientes Activos: ${report.counts.customers}`);
  console.log(`   - Proveedores: ${report.counts.suppliers}`);
  console.log(`   - Empleados / Especialistas: ${report.counts.employees}`);
  if (report.samples.customers.length > 0) {
    console.log(`   - Muestra de clientes:`, report.samples.customers.join(', '));
  } else {
    report.anomaliesDetected.push('El directorio de clientes activos está vacío (0 clientes).');
  }

  // 4. Diagnosticar Inventario y Catálogo
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, name, type, base_price, stock, is_active, deleted_at')
    .eq('tenant_id', tenant.id);

  const activeItems = items?.filter(i => !i.deleted_at) || [];
  report.counts.products = activeItems.filter(i => i.type === 'product').length;
  report.counts.services = activeItems.filter(i => i.type === 'service').length;
  report.counts.totalStockUnits = activeItems.reduce((acc, i) => acc + (Number(i.stock) || 0), 0);

  report.samples.products = activeItems
    .filter(i => i.type === 'product')
    .map(i => `${i.name} (Stock: ${i.stock ?? 0}, $${i.base_price})`)
    .slice(0, 5);

  console.log(`\n📦 Inventario y Catálogo:`);
  console.log(`   - Productos Físicos: ${report.counts.products} (${report.counts.totalStockUnits} unidades en stock total)`);
  console.log(`   - Servicios Clínicos/Comerciales: ${report.counts.services}`);
  if (report.samples.products.length > 0) {
    console.log(`   - Muestra de productos:`, report.samples.products.join(', '));
  } else {
    report.anomaliesDetected.push('El catálogo no tiene productos físicos registrados.');
  }

  // 5. Diagnosticar Transacciones y Documentos
  const { count: docCount } = await supabaseAdmin
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id);
  report.counts.documents = docCount || 0;

  // 6. Diagnosticar Sesiones de Caja
  const { data: sessions } = await supabaseAdmin
    .from('cash_sessions')
    .select('id, status, opened_at')
    .eq('tenant_id', tenant.id)
    .eq('status', 'open');
  report.counts.openCashSessions = sessions?.length || 0;

  console.log(`\n💰 Operaciones Comerciales:`);
  console.log(`   - Facturas / Documentos emitidos: ${report.counts.documents}`);
  console.log(`   - Sesiones de Caja Abiertas actualmente: ${report.counts.openCashSessions}`);

  // Veredicto Final
  if (report.anomaliesDetected.length === 0) {
    report.verdict = 'HEALTHY';
  } else if (report.anomaliesDetected.some(a => a.includes('DEFAULT_SUPERADMINS') || a.includes('secuestrar'))) {
    report.verdict = 'DEGRADED';
  }

  console.log('\n======================================================================');
  console.log(`📊 VEREDICTO DEL SISTEMA: ${report.verdict === 'HEALTHY' ? '🟢 SALUDABLE' : report.verdict === 'DEGRADED' ? '🟡 DEGRADADO / CONFLICTO DE SESIÓN' : '🔴 CRÍTICO'}`);
  console.log('======================================================================');
  
  if (report.anomaliesDetected.length > 0) {
    console.log('\n⚠️ Anomalías Detectadas:');
    report.anomaliesDetected.forEach(a => console.log(`   - ${a}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recomendaciones de Acción Inmediata:');
    report.recommendations.forEach(r => console.log(`   - ${r}`));
  }

  process.exit(0);
}

const target = process.argv[2] || 'djumbo';
runTenantDiagnostic(target).catch(err => {
  console.error('Error durante el diagnóstico:', err);
  process.exit(1);
});
