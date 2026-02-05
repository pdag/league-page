import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance = null;

/**
 * Create a Supabase client for browser-side operations
 * Uses singleton pattern to prevent multiple instances
 */
export function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Manager profile editing will be disabled.');
    return null;
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}
