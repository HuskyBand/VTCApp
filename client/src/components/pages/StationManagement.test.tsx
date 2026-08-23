// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const navMock = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => navMock,
}));

vi.mock('../BottomNav', () => ({
    default: () => null,
}));

vi.mock('@client/stores/UserManager', () => ({
    default: {
        isLoggedIn: true,
        isDirector: true,
        getStations: vi.fn(),
        createStation: vi.fn(),
        updateStation: vi.fn(),
        deleteStation: vi.fn(),
    },
}));

import UserManager from '@client/stores/UserManager';
import StationManagement from './StationManagement';

const mockedUserManager = vi.mocked(UserManager);

describe('StationManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedUserManager.isLoggedIn = true;
        mockedUserManager.isDirector = true;
        mockedUserManager.getStations.mockResolvedValue([
            {
                id: 1,
                name: 'Station 1',
                criteria: ['Posture'],
                feedbackItems: ['Tone'],
            },
        ] as never);
        vi.stubGlobal('confirm', vi.fn(() => true));
    });

    it('loads and renders station data for admins', async () => {
        render(<StationManagement />);

        await waitFor(() => {
            expect(mockedUserManager.getStations).toHaveBeenCalled();
        });

        expect(await screen.findByText('Station 1')).toBeTruthy();
        expect(screen.getByText('Posture')).toBeTruthy();
        expect(screen.getByText('Tone')).toBeTruthy();
    });

    it('redirects non-admin users', async () => {
        mockedUserManager.isDirector = false;

        render(<StationManagement />);

        await waitFor(() => {
            expect(navMock).toHaveBeenCalledWith('/');
        });
    });
});
