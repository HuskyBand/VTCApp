export type StationRole = 'participant' | 'teacher' | 'evaluator';

// Score of 75 = proficient
const hasPassed = (score?: number | null) => score !== undefined && score !== null && score >= 75;

/**
 * Highest station number (1-indexed) passed proficiently with no gap before it,
 * assuming sequential progression through the circuit. `scoresByStation[i]` is
 * the score at station `i + 1`.
 */
export function computeHighestProficientStation(
    scoresByStation: Array<number | null | undefined>
): number {
    let highest = 0;
    for (const score of scoresByStation) {
        if (!hasPassed(score)) break;
        highest += 1;
    }
    return highest;
}

/**
 * Someone who has proficiently passed stations 1..n teaches at stations 1..(n-1)
 * and evaluates at stations 1..(n-2). Since n can never exceed lastStationId
 * through normal progression, the top of the range (stations lastStationId-1
 * and lastStationId) would otherwise never get teachers/evaluators — passing
 * the final station fills that gap. Evaluator takes precedence over teacher
 * when both apply to the same station.
 */
export function computeStationRoleForStation(
    highestProficientStation: number,
    stationId: number,
    lastStationId: number
): StationRole {
    const passedEverything = highestProficientStation === lastStationId;

    const isEvaluator = stationId <= highestProficientStation - 2
        || (passedEverything && (stationId === lastStationId - 1 || stationId === lastStationId));
    if (isEvaluator) return 'evaluator';

    const isTeacher = stationId <= highestProficientStation - 1
        || (passedEverything && stationId === lastStationId);
    if (isTeacher) return 'teacher';

    return 'participant';
}
