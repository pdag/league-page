import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

let supabaseInstance = null;

/**
 * Create a Supabase client for browser-side operations
 * Uses singleton pattern to prevent multiple instances
 */
export function createSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Use NEXT_PUBLIC_ prefixed vars (from Supabase integration) since they're already set
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Manager profile editing will be disabled.');
    return null;
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}
