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
import { getResolvedSupabaseUrl, getResolvedServiceRoleKey } from './supabaseConfig';

let _supabaseAdminInstance: SupabaseClient | null = null;

async function resilientServerFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const MAX_RETRIES = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout defensivo

    try {
      const combinedSignal = init?.signal
        ? (AbortSignal as any).any([init.signal, controller.signal])
        : controller.signal;

      const res = await fetch(input, {
        ...init,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // Si Supabase devuelve 502/503/504 de gateway temporal, reintentar una vez
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < MAX_RETRIES) {
        console.warn(`[supabaseAdmin] Gateway transitorio ${res.status}. Reintentando (${attempt}/${MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, 600));
        continue;
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
      const isNetworkErr = err?.message?.includes('fetch failed') || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT';

      if (attempt < MAX_RETRIES && (isAbort || isNetworkErr)) {
        console.warn(`[supabaseAdmin] Microcorte/Timeout detectado en fetch. Reintentando intento ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin es exclusivo de backend/Server Actions y no puede ejecutarse en el navegador.');
  }

  const supabaseUrl = getResolvedSupabaseUrl();
  const serviceRoleKey = getResolvedServiceRoleKey();

  if (!_supabaseAdminInstance) {
    _supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: resilientServerFetch,
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
