import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { getResolvedSupabaseUrl, getResolvedAnonKey } from './supabaseConfig';

const supabaseUrl = getResolvedSupabaseUrl();
const supabaseAnonKey = getResolvedAnonKey();

export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createClient(supabaseUrl, supabaseAnonKey);

export { supabaseAdmin } from './supabaseAdmin';
