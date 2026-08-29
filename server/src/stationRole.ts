import type { Database } from './database';
import type { User } from '@api/user/User';
import { PermFlags } from '@api/user/User';
import { computeHighestProficientStation, computeStationRoleForStation, type StationRole } from '@api/station/StationRole';

export type { StationRole };

// TODO: Don't make this hardcoded.
const LAST_STATION_ID = 6;

export async function resolveStationRole(
    db: Database,
    user: User & { id: number },
    stationId: number
): Promise<StationRole> {
    // TODO: Should be masked with LevelMask if we add more flags.
    if (
        user.permFlags === PermFlags.IsDirector ||
        user.permFlags === PermFlags.IsLeadership ||
        user.permFlags === PermFlags.IsAssistant
    ) {
        return 'evaluator';
    }

    const override = await db.getStationRoleOverride(user.id, stationId);
    if (override) {
        return override;
    }

    const stationIds = Array.from({ length: LAST_STATION_ID }, (_, i) => i + 1);
    const scores = await Promise.all(
        stationIds.map(async (id) => (await db.getLatestEvaluationForUserStation(user.id, id))?.score)
    );
    const highestProficientStation = computeHighestProficientStation(scores);

    return computeStationRoleForStation(highestProficientStation, stationId, LAST_STATION_ID);
}
