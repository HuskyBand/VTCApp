export type EvaluationRecord = {
    score?: number;
    stationId: number;
    criteria?: string[];
    createdAt?: string;
};

export type EvaluationStatus = 'not_started' | 'developing' | 'satisfactory' | 'mastery';

export const scoreToStatus = (score?: number | null): EvaluationStatus => {
    if (score === undefined || score === null) {
        return 'not_started';
    }
    if (score >= 80) {
        return 'mastery';
    }
    if (score >= 50) {
        return 'satisfactory';
    }
    return 'developing';
};

export const getLatestStationEvaluation = (
    evaluations: EvaluationRecord[],
    stationId: number
): EvaluationRecord | null => {
    const stationEvaluations = evaluations
        .filter((evaluation) => evaluation.stationId === stationId)
        .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });

    return stationEvaluations.length ? stationEvaluations[0] : null;
};

export const hasPassedStation = (evaluations: EvaluationRecord[], stationId: number): boolean => {
    const latest = getLatestStationEvaluation(evaluations, stationId);
    const status = scoreToStatus(latest?.score);
    return status === 'satisfactory' || status === 'mastery';
};

export const isMasteryLocked = (evaluations: EvaluationRecord[], stationId: number): boolean => {
    const latest = getLatestStationEvaluation(evaluations, stationId);
    return scoreToStatus(latest?.score) === 'mastery';
};

const statusLabels: Record<EvaluationStatus, string> = {
    not_started: 'Not Started',
    developing: 'Developing',
    satisfactory: 'Satisfactory',
    mastery: 'Mastery',
};

export const getStatusLabel = (status: EvaluationStatus): string => statusLabels[status];
