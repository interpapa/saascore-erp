/**
 * Configuración resiliente de Supabase
 * Protege contra variables de entorno desactualizadas o proyectos inactivos (ej: acyvim) en Vercel
 */

export const ACTIVE_SUPABASE_URL = "https://nurbajgedeltcvgljsmg.supabase.co";

export const ACTIVE_SUPABASE_ANON_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cmJhamdlZGVsdGN2Z2xqc21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjUzNjgsImV4cCI6MjEwNDIwMTM2OH0.znxIyz6E3EoPCd_XBVW2FF_Ym0sR355itlJzWbyxIOM";

export const ACTIVE_SUPABASE_SERVICE_ROLE_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cmJhamdlZGVsdGN2Z2xqc21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYyNTM2OCwiZXhwIjoyMTA0MjAxMzY4fQ.PSleumsr59zY6GSsnRKy0ha0yqdYn11GkYV5vBnunCc";

export function getResolvedSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!envUrl || envUrl.includes('acyvim') || envUrl.includes('your-project') || !envUrl.startsWith('https://')) {
    return ACTIVE_SUPABASE_URL;
  }
  return envUrl;
}

export function getResolvedAnonKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!envKey || envKey.includes('acyvim') || envKey.includes('your-anon-key')) {
    return ACTIVE_SUPABASE_ANON_KEY;
  }
  return envKey;
}

export function getResolvedServiceRoleKey(): string {
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!envKey || envKey.includes('acyvim') || envKey.includes('your-service-key')) {
    return ACTIVE_SUPABASE_SERVICE_ROLE_KEY;
  }
  return envKey;
}
