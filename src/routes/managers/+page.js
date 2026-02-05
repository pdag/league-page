import {
    getLeagueTeamManagers,
    managers,
    getMergedManagers,
} from '$lib/utils/helper';

export async function load({ fetch }) {
    // Try to get merged managers (database + static), fallback to static
    let resolvedManagers = managers;
    try {
        resolvedManagers = await getMergedManagers(fetch);
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
