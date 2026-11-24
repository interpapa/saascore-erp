import { supabaseAdmin } from '../src/lib/supabaseAdmin';

async function inspectDjumboAccount() {
  console.log('=== INSPECCIÓN FORENSE COMPLETA DE CUENTA DJUMBO ===\n');

  // 1. Auth Users
  const { data: users, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
  if (uErr) console.error('Error listUsers:', uErr);

  const valera = users?.users?.find(u => u.email?.toLowerCase().includes('valera'));
  console.log('1. Usuario Auth en Supabase:');
  if (valera) {
    console.log({
      id: valera.id,
      email: valera.email,
      role: valera.role,
      app_metadata: valera.app_metadata,
      user_metadata: valera.user_metadata,
      created_at: valera.created_at,
      last_sign_in_at: valera.last_sign_in_at,
    });
  } else {
    console.log('No se encontró usuario con "valera" en auth.users');
  }

  // 2. user_tenants
  console.log('\n2. Filas en user_tenants para valerasilvamariajose@gmail.com:');
  const { data: utRows, error: utErr } = await supabaseAdmin
    .from('user_tenants')
    .select('*, tenant:tenants(*)')
    .ilike('user_email', '%valera%');

  console.log(JSON.stringify(utRows, null, 2));

  // 3. Buscar si su ID de usuario está en user_tenants por user_id (si la columna existe)
  try {
    const { data: byId } = await supabaseAdmin
      .from('user_tenants')
      .select('*')
      .eq('user_id', valera?.id);
    console.log('\nFilas por user_id:', byId);
  } catch (e) {
    console.log('\nNo se pudo consultar por user_id');
  }

  // 4. Buscar el tenant Djumbo
  console.log('\n3. Tenant "Djumbo":');
  const { data: djumboTenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .ilike('name', '%djumbo%');
  console.log(JSON.stringify(djumboTenant, null, 2));

  // 5. Ver si su email aparece en el metadata de algún tenant
  console.log('\n4. Tenants donde aparece su email en metadata:');
  const { data: allTenants } = await supabaseAdmin.from('tenants').select('id, name, metadata');
  allTenants?.forEach(t => {
    const metaStr = JSON.stringify(t.metadata || {}).toLowerCase();
    if (metaStr.includes('valera')) {
      console.log(`   Tenant [${t.id}] "${t.name}":`, t.metadata);
    }
  });

  process.exit(0);
}

inspectDjumboAccount().catch(err => {
  console.error(err);
  process.exit(1);
});
