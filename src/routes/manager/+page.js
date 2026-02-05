import {
    waitForAll,
    getLeagueRosters,
    getLeagueTeamManagers,
    getLeagueData,
    getLeagueTransactions,
    getAwards,
    getLeagueRecords,
    managers as managersObj
} from '$lib/utils/helper';

export async function load({ url, fetch }) {
    // Try to get merged managers (database + static), fallback to static
    let resolvedManagers = managersObj;
    try {
        const res = await fetch('/api/manager/profiles');
        if (res.ok) {
            const { profiles } = await res.json();
            if (profiles && profiles.length > 0) {
                const dbProfileMap = new Map();
                for (const profile of profiles) {
                    dbProfileMap.set(profile.sleeper_user_id, profile);
                }
                
                resolvedManagers = managersObj.map(staticManager => {
                    const managerId = staticManager.managerID || staticManager.manager_id;
                    const dbProfile = dbProfileMap.get(managerId);
                    
                    if (!dbProfile) return staticManager;
                    
                    return {
                        ...staticManager,
                        name: dbProfile.name || staticManager.name,
                        location: dbProfile.location || staticManager.location,
                        bio: dbProfile.bio || staticManager.bio,
                        photo: dbProfile.photo_url || staticManager.photo,
                        fantasyStart: dbProfile.fantasy_start_year || staticManager.fantasyStart,
                        favoriteTeam: dbProfile.favorite_team || staticManager.favoriteTeam,
                        mode: dbProfile.mode || staticManager.mode,
                        philosophy: dbProfile.philosophy || staticManager.philosophy,
                        tradingScale: dbProfile.trading_scale || staticManager.tradingScale,
                        managerID: managerId,
                    };
                });
            }
        }
    } catch (e) {
        console.warn('Failed to fetch merged managers, using static:', e);
    }

    if(!resolvedManagers.length) return false;
    const managersInfo = waitForAll(
        getLeagueRosters(),    
        getLeagueTeamManagers(),
        getLeagueData(),
        getLeagueTransactions(),
        getAwards(),
        getLeagueRecords(),
    );

    const manager = url?.searchParams?.get('manager');

    const props = {
        manager: manager && manager < resolvedManagers.length ? manager : -1,
        managers: resolvedManagers,
        managersInfo
    }

    return props;
}
