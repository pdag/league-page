import {
    getLeagueTeamManagers,
    managers,
} from '$lib/utils/helper';

export async function load({ fetch }) {
    // Try to get merged managers (database + static), fallback to static
    let resolvedManagers = managers;
    try {
        const res = await fetch('/api/manager/profiles');
        if (res.ok) {
            const { profiles } = await res.json();
            if (profiles && profiles.length > 0) {
                // Create a map of database profiles by sleeper_user_id
                const dbProfileMap = new Map();
                for (const profile of profiles) {
                    dbProfileMap.set(profile.sleeper_user_id, profile);
                }
                
                // Merge with static managers
                resolvedManagers = managers.map(staticManager => {
                    const managerId = staticManager.managerID || staticManager.manager_id;
                    const dbProfile = dbProfileMap.get(managerId);
                    
                    if (!dbProfile) {
                        return staticManager;
                    }
                    
                    return {
                        ...staticManager,
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
                        managerID: managerId,
                    };
                });
            }
        }
    } catch (e) {
        console.warn('Failed to fetch merged managers, using static:', e);
    }

    if(!resolvedManagers.length) return {managers: resolvedManagers};
    const leagueTeamManagersData = getLeagueTeamManagers();

    const props = {
        managers: resolvedManagers,
        leagueTeamManagersData
    }

    return props;
}
