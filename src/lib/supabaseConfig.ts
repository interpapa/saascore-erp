/**
 * Configuración resiliente de Supabase
 * Protege contra variables de entorno desactualizadas o proyectos inactivos (ej: acyvim) en Vercel
 */

// Credenciales de Producción (nurbajgedeltcvgljsmg)
export const PROD_SUPABASE_URL = "https://nurbajgedeltcvgljsmg.supabase.co";
export const PROD_SUPABASE_ANON_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cmJhamdlZGVsdGN2Z2xqc21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjUzNjgsImV4cCI6MjEwNDIwMTM2OH0.znxIyz6E3EoPCd_XBVW2FF_Ym0sR355itlJzWbyxIOM";
export const PROD_SUPABASE_SERVICE_ROLE_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cmJhamdlZGVsdGN2Z2xqc21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYyNTM2OCwiZXhwIjoyMTA0MjAxMzY4fQ.PSleumsr59zY6GSsnRKy0ha0yqdYn11GkYV5vBnunCc";

// Credenciales de Desarrollo (pfgfsnoblxasiixeveue)
export const DEV_SUPABASE_URL = "https://pfgfsnoblxasiixeveue.supabase.co";
export const DEV_SUPABASE_ANON_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ2Zzbm9ibHhhc2lpeGV2ZXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjUzNzQsImV4cCI6MjEwNDIwMTM3NH0.aCJ_3GWs6kta4LRqGDd6QKNvKqAKjwdc-Daef8Bgwv8";
export const DEV_SUPABASE_SERVICE_ROLE_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmZ2Zzbm9ibHhhc2lpeGV2ZXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYyNTM3NCwiZXhwIjoyMTA0MjAxMzc0fQ.hmoocNnKBQyabarzdEFpsfmHWLjAjN2kmx1_ccbuhv0";

export const ACTIVE_SUPABASE_URL = PROD_SUPABASE_URL;
export const ACTIVE_SUPABASE_ANON_KEY = PROD_SUPABASE_ANON_KEY;
export const ACTIVE_SUPABASE_SERVICE_ROLE_KEY = PROD_SUPABASE_SERVICE_ROLE_KEY;

function getJwtRef(token?: string): string | null {
  if (!token || !token.includes('.')) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof Buffer !== 'undefined' 
      ? Buffer.from(base64, 'base64').toString('utf8')
      : atob(base64);
    const parsed = JSON.parse(json);
    return parsed.ref || null;
  } catch {
    return null;
  }
}

export function getResolvedSupabaseUrl(): string {
  // 1. Detección en navegador (cliente)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Si corre en localhost o 127.0.0.1, usar entorno de Desarrollo
    if (host === 'localhost' || host === '127.0.0.1') {
      return DEV_SUPABASE_URL;
    }
    // En Vercel o dominio web público, SIEMPRE usar Producción
    return PROD_SUPABASE_URL;
  }

  // 2. Detección en servidor / Server Actions
  // Si está desplegado en Vercel, SIEMPRE usar Producción
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    return PROD_SUPABASE_URL;
  }

  // En local/desarrollo server-side, respetar la variable de .env.local si apunta a DEV
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl && envUrl.includes('pfgfsnoblxasiixeveue')) {
    return DEV_SUPABASE_URL;
  }
  if (envUrl && envUrl.includes('nurbajgedeltcvgljsmg')) {
    return PROD_SUPABASE_URL;
  }

  // Fallback en desarrollo local
  if (process.env.NODE_ENV === 'development') {
    return DEV_SUPABASE_URL;
  }

  return PROD_SUPABASE_URL;
}

export function getResolvedAnonKey(): string {
  const url = getResolvedSupabaseUrl();
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url.includes('pfgfsnoblxasiixeveue')) {
    if (envKey && getJwtRef(envKey) === 'pfgfsnoblxasiixeveue') {
      return envKey;
    }
    return DEV_SUPABASE_ANON_KEY;
  }

  // Producción (nurbajgedeltcvgljsmg)
  if (envKey && getJwtRef(envKey) === 'nurbajgedeltcvgljsmg') {
    return envKey;
  }
  return PROD_SUPABASE_ANON_KEY;
}

export function getResolvedServiceRoleKey(): string {
  const url = getResolvedSupabaseUrl();
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url.includes('pfgfsnoblxasiixeveue')) {
    if (envKey && getJwtRef(envKey) === 'pfgfsnoblxasiixeveue') {
      return envKey;
    }
    return DEV_SUPABASE_SERVICE_ROLE_KEY;
  }

  // Producción (nurbajgedeltcvgljsmg)
  if (envKey && getJwtRef(envKey) === 'nurbajgedeltcvgljsmg') {
    return envKey;
  }
  return PROD_SUPABASE_SERVICE_ROLE_KEY;
}

export function getActiveEnvironmentInfo() {
  const url = getResolvedSupabaseUrl();
  const isProd = url.includes('nurbajgedeltcvgljsmg');
  return {
    isProd,
    projectRef: isProd ? 'nurbajgedeltcvgljsmg' : 'pfgfsnoblxasiixeveue',
    environmentName: isProd ? 'Producción (Vercel)' : 'Desarrollo Local (Localhost)',
    url,
  };
}

