import { managers as staticManagers } from '$lib/utils/leagueInfo';

/**
 * Fetches manager profiles from the database and merges them with static managers
 * Database profiles take precedence for matching manager IDs
 */
export async function getMergedManagers(fetch = globalThis.fetch) {
  try {
    const res = await fetch('/api/manager/profiles');
    if (!res.ok) {
      console.warn('Failed to fetch manager profiles, using static managers');
      return staticManagers;
    }
    
    const { profiles } = await res.json();
    
    if (!profiles || profiles.length === 0) {
      return staticManagers;
    }
    
    // Create a map of database profiles by sleeper_user_id
    const dbProfileMap = new Map();
    for (const profile of profiles) {
      dbProfileMap.set(profile.sleeper_user_id, profile);
    }
    
    // Merge with static managers - database profiles override static data
    const mergedManagers = staticManagers.map(staticManager => {
      const managerId = staticManager.managerID || staticManager.manager_id;
      const dbProfile = dbProfileMap.get(managerId);
      
      if (!dbProfile) {
        return staticManager;
      }
      
      // Merge database profile with static manager
      // Database values take precedence if they exist and are non-empty
      return {
        ...staticManager,
        // Map database fields to leagueInfo.js format
        name: dbProfile.name || staticManager.name,
        location: dbProfile.location || staticManager.location,
        bio: dbProfile.bio || staticManager.bio,
        photo: dbProfile.photo_url || staticManager.photo,
        fantasyStart: dbProfile.fantasy_start_year || staticManager.fantasyStart,
        favoriteTeam: dbProfile.favorite_team || staticManager.favoriteTeam,
        mode: dbProfile.mode || staticManager.mode,
        rival: dbProfile.rival_name ? {
          name: dbProfile.rival_name,
          link: dbProfile.rival_manager_id || staticManager.rival?.link,
          image: staticManager.rival?.image || '/managers/question.png'
        } : staticManager.rival,
        favoritePlayer: dbProfile.favorite_player_id || staticManager.favoritePlayer,
        valuePosition: dbProfile.value_position || staticManager.valuePosition,
        rookieOrVets: dbProfile.rookie_or_vets || staticManager.rookieOrVets,
        philosophy: dbProfile.philosophy || staticManager.philosophy,
        tradingScale: dbProfile.trading_scale || staticManager.tradingScale,
        preferredContact: dbProfile.preferred_contact || staticManager.preferredContact,
        // Keep the manager ID consistent
        managerID: managerId,
      };
    });
    
    // Also add any database profiles that don't have a static entry
    // (in case managers were added to the database but not leagueInfo.js)
    for (const profile of profiles) {
      const existsInStatic = staticManagers.some(
        m => (m.managerID || m.manager_id) === profile.sleeper_user_id
      );
      
      if (!existsInStatic) {
        mergedManagers.push({
          managerID: profile.sleeper_user_id,
          name: profile.name || profile.sleeper_username,
          location: profile.location,
          bio: profile.bio,
          photo: profile.photo_url || '/managers/question.png',
          fantasyStart: profile.fantasy_start_year,
          favoriteTeam: profile.favorite_team,
          mode: profile.mode,
          rival: profile.rival_name ? {
            name: profile.rival_name,
            link: profile.rival_manager_id,
            image: '/managers/question.png'
          } : null,
          favoritePlayer: profile.favorite_player_id,
          valuePosition: profile.value_position,
          rookieOrVets: profile.rookie_or_vets,
          philosophy: profile.philosophy,
          tradingScale: profile.trading_scale,
          preferredContact: profile.preferred_contact,
        });
      }
    }
    
    return mergedManagers;
  } catch (error) {
    console.error('Error fetching manager profiles:', error);
    return staticManagers;
  }
}
