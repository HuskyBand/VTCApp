// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PermissionManager, { UserPermission } from './PermissionManager';
import { PermFlags, type User } from '@api/user/User';

vi.mock('@client/http/HttpClient', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            tokenProvider: undefined,
            onUnauthorized: undefined,
        },
    };
});

import http from '@client/http/HttpClient';
import UserManager from './UserManager';

const mockHttp = vi.mocked(http);

const sampleUser: User = {
    username: 'alice',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Tester',
    instrument: 'Trumpet',
    permFlags: PermFlags.IsDirector,
};

describe('UserManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        PermissionManager.permission = UserPermission.BandMember;
        UserManager.clear();
    });

    it('sets and clears user state with storage updates', () => {
        UserManager.setUser('token-123', sampleUser);

        expect(UserManager.isLoggedIn).toBe(true);
        expect(UserManager.currentUser.username).toBe('alice');
        expect(PermissionManager.permission).toBe(UserPermission.DrJahlas);

        const raw = localStorage.getItem('user_data');
        expect(raw).toBeTruthy();

        UserManager.clear();
        expect(UserManager.isLoggedIn).toBe(false);
        expect(localStorage.getItem('user_data')).toBeNull();
    });

    it('returns false on failed login response', async () => {
        mockHttp.post.mockResolvedValueOnce({ ok: false } as never);
        const ok = await UserManager.loginWithPassword('alice', 'bad-password');
        expect(ok).toBe(false);
    });

    it('normalizes stations with missing feedbackItems', async () => {
        mockHttp.get.mockResolvedValueOnce({
            ok: true,
            body: [{ id: 1, name: 'Station 1', criteria: ['Posture'] }],
        } as never);

        const stations = await UserManager.getStations();
        expect(stations).toEqual([
            { id: 1, name: 'Station 1', criteria: ['Posture'], feedbackItems: [] },
        ]);
    });

    it('uses fallback queue messages when response body is empty', async () => {
        mockHttp.post.mockResolvedValueOnce({ ok: true, statusText: 'OK', body: undefined } as never);
        const join = await UserManager.joinStationQueue(2);
        expect(join.success).toBe(true);
        expect(join.message).toBe('Joined queue.');

        mockHttp.delete.mockResolvedValueOnce({ ok: false, statusText: 'Forbidden', body: undefined } as never);
        const leave = await UserManager.leaveStationQueue(2);
        expect(leave.success).toBe(false);
        expect(leave.message).toBe('Forbidden');
    });
});
