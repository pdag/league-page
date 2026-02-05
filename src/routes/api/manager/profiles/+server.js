import { json, error } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/supabase/server';

// GET: Get all manager profiles (public data only)
export async function GET() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    // Return empty array if database not configured (fallback to leagueInfo.js)
    return json({ profiles: [] });
  }

  const { data: profiles, error: fetchError } = await supabase
    .from('manager_profiles')
    .select(`
      sleeper_user_id,
      sleeper_username,
      name,
      location,
      bio,
      photo_url,
      fantasy_start_year,
      favorite_team,
      mode,
      rival_name,
      rival_manager_id,
      favorite_player_id,
      value_position,
      rookie_or_vets,
      philosophy,
      trading_scale,
      preferred_contact
    `)
    .eq('is_verified', true);

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    // Return empty array on error to allow fallback
    return json({ profiles: [] });
  }

  return json({ profiles: profiles || [] });
}
