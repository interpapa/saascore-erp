import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { getResolvedSupabaseUrl, getResolvedAnonKey, getResolvedServiceRoleKey } from './supabaseConfig';

const supabaseUrl = getResolvedSupabaseUrl();
const supabaseAnonKey = getResolvedAnonKey();
const supabaseServiceKey = getResolvedServiceRoleKey();

export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;

