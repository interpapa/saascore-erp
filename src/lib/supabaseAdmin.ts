/**
 * ⚠️  CLIENTE DE SERVIDOR — SOLO PARA SERVER ACTIONS
 * 
 * Este cliente usa la SERVICE_ROLE_KEY, que tiene permisos de Dios
 * sobre la base de datos y BYPASA las Row Level Security (RLS) policies.
 * 
 * NUNCA importar este archivo desde componentes de React o páginas del cliente.
 * Solo usar en archivos que tengan 'use server' al inicio o en rutas de backend.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin es exclusivo de backend/Server Actions y no puede ejecutarse en el navegador.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pfgfsnoblxasiixeveue.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
    || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ2Zzbm9ibHhhc2lpeGV2ZXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYyNTM3NCwiZXhwIjoyMTA0MjAxMzc0fQ.hmoocNnKBQyabarzdEFpsfmHWLjAjN2kmx1_ccbuhv0";

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    console.warn('[supabaseAdmin]: SUPABASE_SERVICE_ROLE_KEY no está configurada explícitamente en el entorno de ejecución.');
  }

  if (!_supabaseAdminInstance) {
    _supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }

  return _supabaseAdminInstance;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (prop in target) {
      return (target as any)[prop];
    }
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(target, prop, value) {
    (target as any)[prop] = value;
    return true;
  }
});
