import { json, error } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/supabase/server';
import { getLeagueTeamManagers } from '$lib/utils/helper';

// Validate session and return user ID
async function validateSession(cookies, supabase) {
  const sessionCookie = cookies.get('manager_session');
  if (!sessionCookie) {
    return null;
  }

  const [sleeper_user_id, sessionToken] = sessionCookie.split(':');
  if (!sleeper_user_id || !sessionToken) {
    return null;
  }

  const { data: profile, error: fetchError } = await supabase
    .from('manager_profiles')
    .select('sleeper_user_id, session_token, session_expires_at, is_verified')
    .eq('sleeper_user_id', sleeper_user_id)
    .single();

  if (fetchError || !profile) {
    return null;
  }

  if (!profile.is_verified || profile.session_token !== sessionToken) {
    return null;
  }

  if (new Date(profile.session_expires_at) < new Date()) {
    return null;
  }

  return sleeper_user_id;
}

// GET: Get current user's profile
export async function GET({ cookies }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw error(500, 'Database not configured');
  }

  const sleeper_user_id = await validateSession(cookies, supabase);
  if (!sleeper_user_id) {
    return json({ authenticated: false });
  }

  const { data: profile, error: fetchError } = await supabase
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
    .eq('sleeper_user_id', sleeper_user_id)
    .single();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    throw error(500, 'Failed to fetch profile');
  }

  // Get league data to provide context
  const leagueTeamManagers = await getLeagueTeamManagers();
  const sleeperUserData = leagueTeamManagers.users[sleeper_user_id] || {};

  return json({
    authenticated: true,
    profile: {
      ...profile,
      sleeper_display_name: sleeperUserData.display_name || sleeperUserData.user_name
    }
  });
}

// PUT: Update current user's profile
export async function PUT({ request, cookies }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw error(500, 'Database not configured');
  }

  const sleeper_user_id = await validateSession(cookies, supabase);
  if (!sleeper_user_id) {
    throw error(401, 'Not authenticated. Please verify your Sleeper account first.');
  }

  const updates = await request.json();

  // Whitelist allowed fields to prevent injection
  const allowedFields = [
    'name',
    'location',
    'bio',
    'photo_url',
    'fantasy_start_year',
    'favorite_team',
    'mode',
    'rival_name',
    'rival_manager_id',
    'favorite_player_id',
    'value_position',
    'rookie_or_vets',
    'philosophy',
    'trading_scale',
    'preferred_contact'
  ];

  const sanitizedUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  }

  sanitizedUpdates.updated_at = new Date().toISOString();

  const { data: updatedProfile, error: updateError } = await supabase
    .from('manager_profiles')
    .update(sanitizedUpdates)
    .eq('sleeper_user_id', sleeper_user_id)
    .select()
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
    throw error(500, 'Failed to update profile');
  }

  return json({
    success: true,
    profile: updatedProfile
  });
}
