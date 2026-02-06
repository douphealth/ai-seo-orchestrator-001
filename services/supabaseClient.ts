import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn('[Supabase] Failed to initialize client:', e);
  }
}

export const supabase = _supabase;
export const isSupabaseAvailable = (): boolean => _supabase !== null;
