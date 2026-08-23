import { describe, expect, it } from 'vitest';
import { computeStationRoleFromScores } from '@api/station/StationRole';

describe('computeStationRoleFromScores', () => {
    it('grants participant with no scores at all', () => {
        expect(computeStationRoleFromScores(undefined, undefined, false)).toBe('participant');
    });

    it('grants participant below the passing threshold at the current station', () => {
        expect(computeStationRoleFromScores(30, 90, false)).toBe('participant');
    });

    it('grants participant when the current station is passed but the next has not started', () => {
        expect(computeStationRoleFromScores(60, undefined, false)).toBe('participant');
    });

    it('grants instructor when both the current and next station are passed', () => {
        expect(computeStationRoleFromScores(60, 60, false)).toBe('instructor');
    });

    it('grants evaluator when the current station is mastered and the next is passed', () => {
        expect(computeStationRoleFromScores(85, 60, false)).toBe('evaluator');
    });

    it('grants participant when the current station is mastered but the next is not passed', () => {
        expect(computeStationRoleFromScores(85, 30, false)).toBe('participant');
    });

    it('grants evaluator at the last station on mastery with no next station to check', () => {
        expect(computeStationRoleFromScores(85, undefined, true)).toBe('evaluator');
    });

    it('grants instructor at the last station on a pass with no next station to check', () => {
        expect(computeStationRoleFromScores(60, undefined, true)).toBe('instructor');
    });
});
