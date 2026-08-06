import type { Database } from './database';
import type { User } from '@api/user/User';
import { PermFlags } from '@api/user/User';
import { computeStationRoleFromScores, type StationRole } from '@api/station/StationRole';

export type { StationRole };

const LAST_STATION_ID = 6;

export async function resolveStationRole(
    db: Database,
    user: User & { id: number },
    stationId: number,
    overrideTier?: string
): Promise<StationRole> {
    if (overrideTier === 'elevated' || overrideTier === 'dr_jahlas') {
        return 'evaluator';
    }

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

    const currentStation = await db.getLatestEvaluationForUserStation(user.id, stationId);
    const isLastStation = stationId >= LAST_STATION_ID;
    const nextStation = isLastStation ? null : await db.getLatestEvaluationForUserStation(user.id, stationId + 1);

    return computeStationRoleFromScores(currentStation?.score, nextStation?.score, isLastStation);
}
