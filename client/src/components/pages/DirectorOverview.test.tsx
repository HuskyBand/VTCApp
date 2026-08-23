// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';

const navMock = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => navMock,
    Link: ({ children }: { children: unknown }) => children,
}));

vi.mock('../BottomNav', () => ({
    default: () => null,
}));

vi.mock('@client/stores/UserManager', () => ({
    default: {
        isLoggedIn: true,
        isDirector: true,
        getOverview: vi.fn(),
        getNotifications: vi.fn(),
        getAllUsers: vi.fn(),
        getEvaluationsForUser: vi.fn(),
        createNotification: vi.fn(),
        getUserStationRoles: vi.fn(),
        setStationRole: vi.fn(),
    },
}));

import UserManager from '@client/stores/UserManager';
import DirectorOverview from './DirectorOverview';

const mockedUserManager = vi.mocked(UserManager);

describe('DirectorOverview', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockedUserManager.isLoggedIn = true;
        mockedUserManager.isDirector = true;
        mockedUserManager.getUserStationRoles.mockResolvedValue([] as never);

        mockedUserManager.getOverview.mockResolvedValue({
            stations: [
                {
                    stationId: 1,
                    name: 'Station 1',
                    mastery: 1,
                    proficient: 1,
                    developing: 0,
                    notStarted: 0,
                    evaluatorCount: 2,
                    totalUsers: 2,
                },
            ],
            activity: [],
            totalUsers: 2,
            totalNotifications: 1,
        } as never);

        mockedUserManager.getNotifications.mockResolvedValue([
            {
                id: 1,
                title: 'Welcome',
                message: 'Hello',
                senderName: 'Director',
                createdAt: new Date().toISOString(),
                category: 'broadcast',
            },
        ] as never);

        mockedUserManager.getAllUsers.mockResolvedValue([
            {
                id: 1,
                username: 'student1',
                email: 's1@example.com',
                firstName: 'Student',
                lastName: 'One',
                instrument: 'Trumpet',
                permFlags: 0,
            },
        ] as never);

        mockedUserManager.getEvaluationsForUser.mockResolvedValue([] as never);
        mockedUserManager.createNotification.mockResolvedValue(true as never);

        vi.spyOn(globalThis, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);
        vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);
    });

    it('loads overview data and renders summary', async () => {
        render(<DirectorOverview />);

        expect(await screen.findByText('Director Overview')).toBeTruthy();
        expect(await screen.findByText('2 members')).toBeTruthy();
        expect(await screen.findByText('Station 1')).toBeTruthy();
    });

    it('sends a broadcast when title and message are provided', async () => {
        render(<DirectorOverview />);

        const titleInput = await screen.findByLabelText('Title');
        const messageInput = await screen.findByLabelText('Message');

        fireEvent.change(titleInput, { target: { value: 'Practice' } });
        fireEvent.change(messageInput, { target: { value: 'Bring music' } });
        fireEvent.click(screen.getAllByRole('button', { name: /Send Broadcast/i })[0]);

        await waitFor(() => {
            expect(mockedUserManager.createNotification).toHaveBeenCalledWith('Practice', 'Bring music');
        });

        expect(await screen.findByText('Broadcast sent to all members.')).toBeTruthy();
    });
});
