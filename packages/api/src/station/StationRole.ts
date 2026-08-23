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
