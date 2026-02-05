import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

/**
 * Create a Supabase client for server-side operations with service role
 * This bypasses RLS for admin operations like verification
 */
export function createServerSupabaseClient() {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase server credentials not found.');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
