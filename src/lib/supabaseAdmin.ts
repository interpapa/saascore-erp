/**
 * ⚠️  CLIENTE DE SERVIDOR — SOLO PARA SERVER ACTIONS
 * 
 * Este cliente usa la SERVICE_ROLE_KEY, que tiene permisos de Dios
 * sobre la base de datos y BYPASA las Row Level Security (RLS) policies.
 * 
 * NUNCA importar este archivo desde componentes de React o páginas del cliente.
 * Solo usar en archivos que tengan 'use server' al inicio.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada. Los Server Actions no pueden operar de forma segura.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    // El cliente admin nunca persiste sesiones de usuario
    persistSession: false,
    autoRefreshToken: false,
  }
});
