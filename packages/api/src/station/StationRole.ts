export type StationRole = 'participant' | 'instructor' | 'evaluator';

/**
 * Pure score-to-role math, factored out of the old canSubmitEvaluation so it's
 * testable without a database. `evaluator` needs mastery (>=80) here and a pass
 * (>=50) at the next station; `instructor` needs a pass (>=50) here and a pass
 * at the next station; anything else is `participant`.
 */
export function computeStationRoleFromScores(
    currentScore: number | null | undefined,
    nextScore: number | null | undefined,
    isLastStation: boolean
): StationRole {
    const isMastery = (score?: number | null) => score !== undefined && score !== null && score >= 80;
    const hasPassed = (score?: number | null) => score !== undefined && score !== null && score >= 50;

    const currentMastery = isMastery(currentScore);
    const currentPassed = hasPassed(currentScore);
    const nextPassed = isLastStation || hasPassed(nextScore);

    if (currentMastery && nextPassed) return 'evaluator';
    if ((currentPassed || currentMastery) && nextPassed) return 'instructor';
    return 'participant';
}

function demo() {
    const assertEqual = (actual: StationRole, expected: StationRole, label: string) => {
        if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
    };

    assertEqual(computeStationRoleFromScores(undefined, undefined, false), 'participant', 'no scores at all');
    assertEqual(computeStationRoleFromScores(30, 90, false), 'participant', 'below 50 at current station');
    assertEqual(computeStationRoleFromScores(60, undefined, false), 'participant', 'passed here, next not started');
    assertEqual(computeStationRoleFromScores(60, 60, false), 'instructor', 'passed here, passed next');
    assertEqual(computeStationRoleFromScores(85, 60, false), 'evaluator', 'mastery here, passed next');
    assertEqual(computeStationRoleFromScores(85, 30, false), 'participant', 'mastery here but next not passed');
    assertEqual(computeStationRoleFromScores(85, undefined, true), 'evaluator', 'mastery at last station, no next station to check');
    assertEqual(computeStationRoleFromScores(60, undefined, true), 'instructor', 'passed at last station, no next station to check');

    console.log('StationRole self-check passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    demo();
}
