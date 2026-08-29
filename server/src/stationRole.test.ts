import { describe, expect, it } from 'vitest';
import { computeHighestProficientStation, computeStationRoleForStation } from '@api/station/StationRole';

const LAST_STATION_ID = 6;

describe('computeHighestProficientStation', () => {
    it('returns 0 with no scores at all', () => {
        expect(computeHighestProficientStation([])).toBe(0);
    });

    it('returns 0 when station 1 has not been passed', () => {
        expect(computeHighestProficientStation([30, 90, 90])).toBe(0);
    });

    it('returns the count of leading passed stations', () => {
        expect(computeHighestProficientStation([60, 55, 90])).toBe(0);
    });

    it('stops counting at the first gap', () => {
        expect(computeHighestProficientStation([80, 75, 30, 90])).toBe(2);
    });

    it('treats a missing score as a gap', () => {
        expect(computeHighestProficientStation([60, undefined, 90])).toBe(0);
    });

    it('does not require mastery, only a pass, to count a station', () => {
        expect(computeHighestProficientStation([75])).toBe(1);
    });
});

describe('computeStationRoleForStation', () => {
    it('grants participant when the station is beyond the evaluator/teacher range', () => {
        expect(computeStationRoleForStation(0, 1, LAST_STATION_ID)).toBe('participant');
    });

    it('grants evaluator at station 1 for someone who passed stations 1-3 (n-2 reaches station 1)', () => {
        expect(computeStationRoleForStation(3, 1, LAST_STATION_ID)).toBe('evaluator');
    });

    it('grants teacher (not evaluator) at station 2 for someone who passed stations 1-3', () => {
        expect(computeStationRoleForStation(3, 2, LAST_STATION_ID)).toBe('teacher');
    });

    it('grants participant at station n and beyond for someone who passed stations 1-3', () => {
        expect(computeStationRoleForStation(3, 3, LAST_STATION_ID)).toBe('participant');
        expect(computeStationRoleForStation(3, 4, LAST_STATION_ID)).toBe('participant');
    });

    it('grants evaluator at stations 1 through n-2 for someone who passed stations 1-4', () => {
        expect(computeStationRoleForStation(4, 1, LAST_STATION_ID)).toBe('evaluator');
        expect(computeStationRoleForStation(4, 2, LAST_STATION_ID)).toBe('evaluator');
    });

    it('grants teacher (not evaluator) at station n-1 for someone who passed stations 1-4', () => {
        expect(computeStationRoleForStation(4, 3, LAST_STATION_ID)).toBe('teacher');
    });

    it('grants evaluator at the final station for someone who passed all stations, since evaluator outranks the teacher special case there', () => {
        expect(computeStationRoleForStation(LAST_STATION_ID, LAST_STATION_ID, LAST_STATION_ID)).toBe('evaluator');
    });

    it('grants evaluator at the second-to-last station for someone who passed all stations', () => {
        expect(computeStationRoleForStation(LAST_STATION_ID, LAST_STATION_ID - 1, LAST_STATION_ID)).toBe('evaluator');
    });

    it('grants evaluator everywhere for someone who passed all stations, via the general range plus the last-station special case', () => {
        for (let station = 1; station <= LAST_STATION_ID; station++) {
            expect(computeStationRoleForStation(LAST_STATION_ID, station, LAST_STATION_ID)).toBe('evaluator');
        }
    });
});
