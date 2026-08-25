import { describe, expect, it } from 'vitest';

import {
    getLatestStationEvaluation,
    getStatusLabel,
    scoreToStatus,
} from './evaluationHelpers';

describe('scoreToStatus', () => {
    it('maps empty scores to not_started', () => {
        expect(scoreToStatus(undefined)).toBe('not_started');
        expect(scoreToStatus(null)).toBe('not_started');
    });

    it('maps thresholds correctly', () => {
        expect(scoreToStatus(49)).toBe('developing');
        expect(scoreToStatus(50)).toBe('proficient');
        expect(scoreToStatus(79)).toBe('proficient');
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

describe('getStatusLabel', () => {
    it('returns friendly labels', () => {
        expect(getStatusLabel('not_started')).toBe('Not Started');
        expect(getStatusLabel('developing')).toBe('Developing');
        expect(getStatusLabel('proficient')).toBe('Satisfactory');
        expect(getStatusLabel('mastery')).toBe('Mastery');
    });
});
