// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';

const navMock = vi.fn();

vi.mock('react-router', () => ({
    useParams: () => ({ stationId: '1' }),
    useSearchParams: () => [new URLSearchParams('')],
    useNavigate: () => navMock,
}));

vi.mock('../BottomNav', () => ({
    default: () => null,
}));

vi.mock('@client/stores/UserManager', () => ({
    default: {
        isLoggedIn: true,
        isDirector: false,
        currentUser: { id: 99 },
        getAllUsers: vi.fn(),
        getStation: vi.fn(),
        getEvaluationsForUser: vi.fn(),
        submitEvaluation: vi.fn(),
    },
}));

vi.mock('@client/stores/PermissionManager', () => ({
    default: {
        canViewAdmin: vi.fn(),
        canEvaluate: vi.fn(),
    },
}));

import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';
import EvaluationForm from './EvaluationForm';

const mockedUserManager = vi.mocked(UserManager);
const mockedPermissionManager = vi.mocked(PermissionManager);

describe('EvaluationForm', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockedPermissionManager.canViewAdmin.mockReturnValue(false);
        mockedPermissionManager.canEvaluate.mockReturnValue(true);
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
        mockedUserManager.getStation.mockResolvedValue({
            id: 1,
            name: 'Station 1',
            criteria: ['Posture'],
            feedbackItems: ['Tone'],
        } as never);
        mockedUserManager.getEvaluationsForUser.mockResolvedValue([] as never);
        mockedUserManager.submitEvaluation.mockResolvedValue(true as never);
    });

    it('keeps submit disabled until a student is selected', async () => {
        render(<EvaluationForm />);

        await waitFor(() => {
            expect(mockedUserManager.getAllUsers).toHaveBeenCalled();
        });

        const submitButton = await screen.findByRole('button', { name: 'Submit Evaluation' });
        expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('submits evaluation and navigates back to evaluate page', async () => {
        render(<EvaluationForm />);

        await waitFor(() => {
            expect(mockedUserManager.getStation).toHaveBeenCalled();
        });

        const select = await screen.findByLabelText('Select Student to Evaluate:');
        fireEvent.change(select, { target: { value: '1' } });

        const submitButton = await screen.findByRole('button', { name: 'Submit Evaluation' });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockedUserManager.submitEvaluation).toHaveBeenCalled();
        });

        expect(navMock).toHaveBeenCalledWith('/evaluate?stationId=1');
    });
});
