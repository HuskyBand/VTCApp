// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, cleanup, screen } from '@testing-library/react';

const navMock = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => navMock,
    useSearchParams: () => [new URLSearchParams('')],
}));

vi.mock('../BottomNav', () => ({
    default: () => null,
}));

vi.mock('jsqr', () => ({
    default: vi.fn(() => null),
}));

vi.mock('@client/stores/UserManager', () => ({
    default: {
        isLoggedIn: true,
        currentUser: { id: 99 },
        getEvaluationsForUser: vi.fn(),
        getStations: vi.fn(),
        getStationQueue: vi.fn(),
        takeNextStationQueue: vi.fn(),
        getAllUsers: vi.fn(),
    },
}));

import UserManager from '@client/stores/UserManager';
import EvaluateSelectStation from './EvaluateSelectStation';

const mockedUserManager = vi.mocked(UserManager);

describe('EvaluateSelectStation', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();

        mockedUserManager.getEvaluationsForUser.mockResolvedValue([
            { stationId: 1, score: 85 },
            { stationId: 2, score: 70 },
        ] as never);

        mockedUserManager.getStations.mockResolvedValue([
            { id: 1, name: 'Station 1', criteria: ['Posture'], feedbackItems: [], role: 'evaluator' },
            { id: 2, name: 'Station 2', criteria: ['Rhythm'], feedbackItems: [], role: 'evaluator' },
        ] as never);

        mockedUserManager.getStationQueue.mockResolvedValue([] as never);
        mockedUserManager.takeNextStationQueue.mockResolvedValue({ success: false, message: 'No queue' } as never);

        vi.spyOn(globalThis, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);
        vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);
    });

    it('navigates to manual evaluation after selecting an eligible station', async () => {
        const { container } = render(<EvaluateSelectStation />);

        await waitFor(() => {
            expect(mockedUserManager.getStations).toHaveBeenCalled();
        });

        const stationRadio = container.querySelector('input[type="radio"][value="1"]') as HTMLInputElement;
        fireEvent.click(stationRadio);

        const continueButton = await screen.findByRole('button', { name: 'Continue (Manual)' });
        fireEvent.click(continueButton);

        expect(navMock).toHaveBeenCalledWith('/evaluate/station/1');
    });

    it('pulls next student and navigates with studentId query', async () => {
        mockedUserManager.getStationQueue.mockResolvedValue([
            { id: 1, name: 'Student One', userId: 1, position: 1, requestedAt: new Date().toISOString() },
        ] as never);
        mockedUserManager.takeNextStationQueue.mockResolvedValue({
            success: true,
            removedEntry: { id: 1, stationId: 1, userId: 42, requestedAt: new Date().toISOString(), status: 'waiting' },
        } as never);

        const { container } = render(<EvaluateSelectStation />);

        await waitFor(() => {
            expect(mockedUserManager.getStations).toHaveBeenCalled();
        });

        const stationRadio = container.querySelector('input[type="radio"][value="1"]') as HTMLInputElement;
        fireEvent.click(stationRadio);

        await screen.findByText('1 student(s) waiting.');

        const pullButton = await screen.findByRole('button', { name: 'Pull Next Student' });
        fireEvent.click(pullButton);

        await waitFor(() => {
            expect(mockedUserManager.takeNextStationQueue).toHaveBeenCalledWith(1);
        });

        expect(navMock).toHaveBeenCalledWith('/evaluate/station/1?studentId=42');
    });
});
