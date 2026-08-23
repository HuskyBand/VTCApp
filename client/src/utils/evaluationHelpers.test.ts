import { describe, expect, it } from 'vitest';

import {
    canEvaluateStation,
    canTeachStation,
    getLatestStationEvaluation,
    getStatusLabel,
    hasPassedStation,
    scoreToStatus,
} from './evaluationHelpers';

describe('scoreToStatus', () => {
    it('maps empty scores to not_started', () => {
        expect(scoreToStatus(undefined)).toBe('not_started');
        expect(scoreToStatus(null)).toBe('not_started');
    });

    it('maps thresholds correctly', () => {
        expect(scoreToStatus(49)).toBe('developing');
        expect(scoreToStatus(50)).toBe('satisfactory');
        expect(scoreToStatus(79)).toBe('satisfactory');
        expect(scoreToStatus(80)).toBe('mastery');
    });
});

describe('getLatestStationEvaluation', () => {
    it('returns the newest entry for a station', () => {
        const evaluations = [
            { stationId: 10, score: 45, createdAt: '2026-08-01T10:00:00.000Z' },
            { stationId: 10, score: 90, createdAt: '2026-08-01T11:00:00.000Z' },
            { stationId: 9, score: 99, createdAt: '2026-08-01T12:00:00.000Z' },
        ];

        expect(getLatestStationEvaluation(evaluations, 10)?.score).toBe(90);
        expect(getLatestStationEvaluation(evaluations, 11)).toBeNull();
    });
});

describe('progression helpers', () => {
    const stationOrder = [1, 2, 3];

    it('requires mastery before evaluation unlocks', () => {
        const evaluations = [{ stationId: 1, score: 79 }];

        expect(canEvaluateStation(evaluations, 1, stationOrder)).toBe(false);
    });

    it('requires next station pass for evaluate/teach when ordered', () => {
        const evaluations = [
            { stationId: 1, score: 85 },
            { stationId: 2, score: 70 },
        ];

        expect(canEvaluateStation(evaluations, 1, stationOrder)).toBe(true);
        expect(canTeachStation(evaluations, 1, stationOrder)).toBe(true);
        expect(hasPassedStation(evaluations, 2)).toBe(true);
    });

    it('blocks teaching when status is developing or not_started', () => {
        expect(canTeachStation([{ stationId: 2, score: 25 }], 2, stationOrder)).toBe(false);
        expect(canTeachStation([], 2, stationOrder)).toBe(false);
    });
});

describe('getStatusLabel', () => {
    it('returns friendly labels', () => {
        expect(getStatusLabel('not_started')).toBe('Not Started');
        expect(getStatusLabel('developing')).toBe('Developing');
        expect(getStatusLabel('satisfactory')).toBe('Satisfactory');
        expect(getStatusLabel('mastery')).toBe('Mastery');
    });
});
