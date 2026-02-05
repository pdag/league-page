import { json, error } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/supabase/server';
import { getLeagueTeamManagers } from '$lib/utils/helper';
import { leagueID } from '$lib/utils/leagueInfo';

/**
 * Verification flow:
 * 1. User enters their Sleeper username
 * 2. We generate a unique verification code
 * 3. User adds this code to their Sleeper bio
 * 4. We check if the code exists in their Sleeper bio
 * 5. If verified, we store their session token
 */

// Generate a random 6-character verification code
function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a secure session token
function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// POST: Start verification - generate code for user
export async function POST({ request, cookies }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw error(500, 'Database not configured');
  }

  const { sleeper_username } = await request.json();

  if (!sleeper_username) {
    throw error(400, 'Sleeper username is required');
  }

  // Fetch the user from Sleeper API
  const sleeperRes = await fetch(`https://api.sleeper.app/v1/user/${sleeper_username}`);
  if (!sleeperRes.ok) {
    throw error(404, 'Sleeper user not found');
  }
  const sleeperUser = await sleeperRes.json();
  
  if (!sleeperUser || !sleeperUser.user_id) {
    throw error(404, 'Sleeper user not found');
  }

  // Check if this user is in the league
  const leagueTeamManagers = await getLeagueTeamManagers();
  if (!leagueTeamManagers.users[sleeperUser.user_id]) {
    throw error(403, 'This Sleeper account is not a member of this league');
  }

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Store pending verification in database
  const { error: dbError } = await supabase
    .from('manager_profiles')
    .upsert({
      sleeper_user_id: sleeperUser.user_id,
      sleeper_username: sleeperUser.username || sleeperUser.display_name,
      verification_code: verificationCode,
      verification_expires_at: expiresAt.toISOString(),
      is_verified: false,
    }, {
      onConflict: 'sleeper_user_id'
    });

  if (dbError) {
    console.error('Database error:', dbError);
    throw error(500, 'Failed to start verification');
  }

  return json({
    success: true,
    verification_code: verificationCode,
    sleeper_user_id: sleeperUser.user_id,
    sleeper_username: sleeperUser.username || sleeperUser.display_name,
    message: `Add this code to your Sleeper bio: ${verificationCode}`
  });
}

// PUT: Complete verification - check if code is in bio
export async function PUT({ request, cookies }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    throw error(500, 'Database not configured');
  }

  const { sleeper_user_id } = await request.json();

  if (!sleeper_user_id) {
    throw error(400, 'Sleeper user ID is required');
  }

  // Get pending verification from database
  const { data: profile, error: fetchError } = await supabase
    .from('manager_profiles')
    .select('verification_code, verification_expires_at')
    .eq('sleeper_user_id', sleeper_user_id)
    .single();

  if (fetchError || !profile) {
    throw error(404, 'No pending verification found. Please start verification again.');
  }

  // Check if verification has expired
  if (new Date(profile.verification_expires_at) < new Date()) {
    throw error(400, 'Verification code has expired. Please start again.');
  }

  // Fetch current Sleeper user data to check bio
  const sleeperRes = await fetch(`https://api.sleeper.app/v1/user/${sleeper_user_id}`);
  if (!sleeperRes.ok) {
    throw error(500, 'Failed to fetch Sleeper user data');
  }
  const sleeperUser = await sleeperRes.json();

  // Check if verification code is in the user's metadata/bio
  // Sleeper stores this in the "metadata" field
  const metadata = sleeperUser.metadata || {};
  const bio = metadata.team_name || metadata.mention_pn || '';
  const displayName = sleeperUser.display_name || '';
  
  // Check multiple fields where user might put the code
  const fieldsToCheck = [
    bio,
    displayName,
    metadata.team_name || '',
    JSON.stringify(metadata) // Check entire metadata as fallback
  ].join(' ');

  if (!fieldsToCheck.includes(profile.verification_code)) {
    throw error(400, `Verification code not found. Please add "${profile.verification_code}" to your Sleeper team name or display name, then try again.`);
  }

  // Generate session token
  const sessionToken = generateSessionToken();
  const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Update profile as verified with session token
  const { error: updateError } = await supabase
    .from('manager_profiles')
    .update({
      is_verified: true,
      session_token: sessionToken,
      session_expires_at: sessionExpires.toISOString(),
      verification_code: null,
      verification_expires_at: null,
      last_verified_at: new Date().toISOString()
    })
    .eq('sleeper_user_id', sleeper_user_id);

  if (updateError) {
    console.error('Database error:', updateError);
    throw error(500, 'Failed to complete verification');
  }

  // Set session cookie
  cookies.set('manager_session', `${sleeper_user_id}:${sessionToken}`, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  });

  return json({
    success: true,
    message: 'Verification successful! You can now edit your profile.',
    sleeper_user_id
  });
}

// DELETE: Logout - clear session
export async function DELETE({ cookies }) {
  cookies.delete('manager_session', { path: '/' });
  return json({ success: true });
}
