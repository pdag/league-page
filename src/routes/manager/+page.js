import {
    waitForAll,
    getLeagueRosters,
    getLeagueTeamManagers,
    getLeagueData,
    getLeagueTransactions,
    getAwards,
    getLeagueRecords,
    managers as managersObj,
    getMergedManagers
} from '$lib/utils/helper';

export async function load({ url, fetch }) {
    // Try to get merged managers (database + static), fallback to static
    let resolvedManagers = managersObj;
    try {
        resolvedManagers = await getMergedManagers(fetch);
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
