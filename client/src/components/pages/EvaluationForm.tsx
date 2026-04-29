import { useParams, useSearchParams } from "react-router";
import BottomNav from "../BottomNav";
import { useState, useEffect } from "react";
import UserManager from "@client/stores/UserManager";
import PermissionManager from "@client/stores/PermissionManager";
import type { User } from "@api/user/User";
import {
    canEvaluateStation,
    canTeachStation,
    getLatestStationEvaluation,
    isMasteryLocked,
    scoreToStatus,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";

type Criterion = {
    name: string;
    status: 'developing' | 'satisfactory' | 'mastery';
};

export default function EvaluationForm() {
    const { stationId } = useParams();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([
        { name: 'Criteria 1', status: 'developing' },
        { name: 'Criteria 2', status: 'developing' },
        { name: 'Criteria 3', status: 'developing' },
        { name: 'Criteria 4', status: 'developing' },
    ]);
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [myEvaluations, setMyEvaluations] = useState<EvaluationRecord[]>([]);
    const [targetEvaluations, setTargetEvaluations] = useState<EvaluationRecord[]>([]);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        loadUsers();
        loadMyEvaluations();
    }, []);

    useEffect(() => {
        if (!selectedUser) {
            setTargetEvaluations([]);
            return;
        }

        const loadTargetEvaluations = async () => {
            const evaluations = await UserManager.getEvaluationsForUser(selectedUser.id!);
            setTargetEvaluations(evaluations);
        };

        loadTargetEvaluations();
    }, [selectedUser]);

    const loadUsers = async () => {
        try {
            const users = await UserManager.getAllUsers();
            if (!users || users.length === 0) {
                setMessage('No students found in the system.');
            } else {
                setAllUsers(users);
            }
        } catch (error) {
            setMessage(`Failed to load user list: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    useEffect(() => {
        const studentId = Number(searchParams.get('studentId'));
        if (studentId && allUsers.length > 0) {
            const found = allUsers.find((user) => user.id === studentId);
            if (found) {
                setSelectedUser(found);
            }
        }
    }, [allUsers, searchParams]);

    const loadMyEvaluations = async () => {
        if (!UserManager.isLoggedIn) {
            return;
        }

        const evaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
        setMyEvaluations(evaluations);
    };

    const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = parseInt(e.target.value);
        const user = allUsers.find(u => u.id === userId) || null;
        setSelectedUser(user);
        setMessage('');
    };

    const handleStatusChange = (index: number, newStatus: 'developing' | 'satisfactory' | 'mastery') => {
        const newCriteria = [...criteria];
        newCriteria[index].status = newStatus;
        setCriteria(newCriteria);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'developing': return 'purple';
            case 'satisfactory': return 'grey';
            case 'mastery': return 'gold';
            default: return 'grey';
        }
    };

    const calculateScore = () => {
        const statusValues = { developing: 1, satisfactory: 2, mastery: 3 };
        const minStatus = criteria.reduce((min, crit) => Math.min(min, statusValues[crit.status]), statusValues.developing);
        return Math.round((minStatus / 3) * 100); // Use lowest criterion to determine overall station status.
    };

    const currentStationId = Number(stationId);
    const currentEligibility = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(myEvaluations, currentStationId) || canTeachStation(myEvaluations, currentStationId);
    const targetAtMastery = selectedUser ? isMasteryLocked(targetEvaluations, currentStationId) : false;

    const handleSubmit = async () => {
        if (!selectedUser) {
            setMessage('Please select a valid user first.');
            return;
        }

        if (!currentEligibility) {
            setMessage('You are not eligible to submit evaluations for this station yet. Earn mastery and pass the next station first.');
            return;
        }

        if (targetAtMastery) {
            setMessage('This student has already reached mastery at this station and cannot be re-evaluated here.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const score = calculateScore();
            const success = await UserManager.submitEvaluation(
                selectedUser.id!,
                currentStationId,
                score,
                comments,
                criteria.map((crit) => crit.status)
            );

            if (success) {
                setMessage('Evaluation submitted successfully!');
                setSelectedUser(null);
                setComments('');
                setCriteria(criteria.map(c => ({ ...c, status: 'developing' })));
                await loadMyEvaluations();
                setTargetEvaluations([]);
            } else {
                setMessage('Failed to submit evaluation. Please try again.');
            }
        } catch (error) {
            console.error('Evaluation submission error:', error);
            setMessage('An error occurred while submitting the evaluation. Please try again.');
        }

        setIsSubmitting(false);
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate Station {stationId}</h1>
                    <div className="evaluation-form">
                        <div className="form-group">
                            <label htmlFor="user-select">Select Student to Evaluate:</label>
                            <select
                                id="user-select"
                                value={selectedUser?.id || ''}
                                onChange={handleUserSelect}
                                className="text-input"
                            >
                                <option value="">-- Select a student --</option>
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.username}) - {user.instrument}
                                    </option>
                                ))}
                            </select>
                            {selectedUser && (
                                <div className="selected-user valid">
                                    <strong>✓ Selected:</strong> {selectedUser.firstName} {selectedUser.lastName} - {selectedUser.instrument}
                                </div>
                            )}
                        </div>

                        <div className="status-help">
                            <p>
                                Your station eligibility is based on your own progress. You need{' '}
                                <strong>mastery on this station</strong> and a successful pass of the next station to act as an evaluator.
                            </p>
                            <p>
                                {UserManager.isDirector ? 'As Director, you may evaluate regardless of progress.' : `Your current status for this station is ${scoreToStatus(getLatestStationEvaluation(myEvaluations, currentStationId)?.score)}.`}
                            </p>
                        </div>

                        <div className="main-points">
                            <h3>Station {stationId} - Main Points</h3>
                            <ul>
                                <li>Point 1 to look for</li>
                                <li>Point 2 to look for</li>
                            </ul>
                        </div>

                        <div className="criteria-form-list">
                            {criteria.map((criterion, idx) => (
                                <div key={idx} className="criteria-form-row">
                                    <div className="criteria-form-info">
                                        <div className="criteria-name">{criterion.name}</div>
                                    </div>
                                    <div className="criteria-status-selector">
                                        {(['developing', 'satisfactory', 'mastery'] as const).map(status => (
                                            <button
                                                key={status}
                                                className={`status-option ${getStatusColor(status)} ${criterion.status === status ? 'active' : ''}`}
                                                onClick={() => handleStatusChange(idx, status)}
                                            >
                                                {status === 'mastery' ? 'Mastery' : status.charAt(0).toUpperCase() + status.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="form-group">
                            <label htmlFor="comments">Comments (Optional):</label>
                            <textarea
                                id="comments"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="text-input"
                                rows={3}
                                placeholder="Additional comments about the evaluation..."
                            />
                        </div>

                        {targetAtMastery && (
                            <div className="message error-message">
                                The selected student already has mastery at this station and can no longer be re-evaluated here.
                            </div>
                        )}

                        {message && (
                            <div className={`message ${message.includes('success') ? 'success-message' : 'error-message'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            className="button primary submit-btn"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedUser || targetAtMastery || !currentEligibility}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                        </button>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}
