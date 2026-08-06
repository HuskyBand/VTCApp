import { useParams, useSearchParams, useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import { useState, useEffect } from "react";
import UserManager from "@client/stores/UserManager";
import PermissionManager from "@client/stores/PermissionManager";
import type { User } from "@api/user/User";
import {
    canEvaluateStation,
    canTeachStation,
    getLatestStationEvaluation,
    getStatusLabel,
    isMasteryLocked,
    scoreToStatus,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";

type CriterionLevel = 'developing' | 'proficient' | 'mastery';

type Criterion = {
    name: string;
    level: CriterionLevel;
};

const levelScore: Record<CriterionLevel, number> = {
    developing: 33,
    proficient: 67,
    mastery: 100,
};

export default function EvaluationForm() {
    const { stationId } = useParams();
    const nav = useNavigate();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [feedbackOptions, setFeedbackOptions] = useState<string[]>([]);
    const [stationName, setStationName] = useState(`Station ${stationId}`);
    const [feedbackChecked, setFeedbackChecked] = useState<Set<string>>(new Set());
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [myEvaluations, setMyEvaluations] = useState<EvaluationRecord[]>([]);
    const [targetEvaluations, setTargetEvaluations] = useState<EvaluationRecord[]>([]);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        loadUsers();
        loadMyEvaluations();
        loadStationCriteria();
    }, [stationId]);

    useEffect(() => {
        if (!selectedUser) {
            setTargetEvaluations([]);
            return;
        }
        UserManager.getEvaluationsForUser(selectedUser.id!).then(setTargetEvaluations);
    }, [selectedUser]);

    const loadStationCriteria = async () => {
        const station = await UserManager.getStation(Number(stationId));
        if (station) {
            setStationName(station.name);
            setCriteria(station.criteria?.length > 0 ? station.criteria.map((name) => ({ name, level: 'developing' })) : []);
            setFeedbackOptions(station.feedbackItems ?? []);
        }
    };

    const loadUsers = async () => {
        try {
            const users = await UserManager.getAllUsers();
            setAllUsers(users ?? []);
            if (!users || users.length === 0) {
                setMessage('No students found in the system.');
            }
        } catch (error) {
            setMessage(`Failed to load user list: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    useEffect(() => {
        const studentId = Number(searchParams.get('studentId'));
        if (studentId && allUsers.length > 0) {
            const found = allUsers.find((user) => user.id === studentId);
            if (found) setSelectedUser(found);
        }
    }, [allUsers, searchParams]);

    const loadMyEvaluations = async () => {
        if (!UserManager.isLoggedIn) return;
        const evaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
        setMyEvaluations(evaluations);
    };

    const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = parseInt(e.target.value);
        setSelectedUser(allUsers.find((u) => u.id === userId) || null);
        setMessage('');
    };

    const handleLevelChange = (index: number, newLevel: CriterionLevel) => {
        setCriteria((prev) => prev.map((c, i) => i === index ? { ...c, level: newLevel } : c));
    };

    const toggleFeedback = (item: string) => {
        setFeedbackChecked((prev) => {
            const next = new Set(prev);
            if (next.has(item)) next.delete(item);
            else next.add(item);
            return next;
        });
    };

    const getOverallStatus = (): CriterionLevel => {
        if (criteria.length === 0) return 'developing';
        const order: CriterionLevel[] = ['developing', 'proficient', 'mastery'];
        return criteria.reduce<CriterionLevel>((lowest, c) => {
            return order.indexOf(c.level) < order.indexOf(lowest) ? c.level : lowest;
        }, 'mastery');
    };

    const hasPassed = (): boolean => {
        const status = getOverallStatus();
        return status === 'proficient' || status === 'mastery';
    };

    const calculateScore = (): number => {
        if (criteria.length === 0) return 0;
        const minScore = criteria.reduce((min, c) => Math.min(min, levelScore[c.level]), 100);
        return minScore;
    };

    const currentStationId = Number(stationId);
    const currentEligibility =
        PermissionManager.canViewAdmin() ||
        PermissionManager.canEvaluate() ||
        canEvaluateStation(myEvaluations, currentStationId) ||
        canTeachStation(myEvaluations, currentStationId);
    const targetAtMastery = selectedUser ? isMasteryLocked(targetEvaluations, currentStationId) : false;

    const overallStatus = getOverallStatus();
    const passed = hasPassed();

    const handleSubmit = async () => {
        if (!selectedUser) {
            setMessage('Please select a valid user first.');
            return;
        }
        if (!currentEligibility) {
            setMessage('You are not eligible to submit evaluations for this station yet.');
            return;
        }
        if (targetAtMastery) {
            setMessage('This student has already reached mastery and cannot be re-evaluated here.');
            return;
        }
        if (criteria.length === 0) {
            setMessage('No criteria defined for this station. Ask the director to add criteria first.');
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
                criteria.map((c) => c.level),
                Array.from(feedbackChecked),
                overallStatus
            );

            if (success) {
                nav(`/evaluate?stationId=${currentStationId}`);
                return;
            } else {
                setMessage('Failed to submit evaluation. Please try again.');
            }
        } catch (error) {
            setMessage('An error occurred while submitting. Please try again.');
        }

        setIsSubmitting(false);
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate {stationName}</h1>
                    <div className="evaluation-form">

                        {/* Student selection */}
                        <div className="form-group">
                            <label htmlFor="user-select">Select Student to Evaluate:</label>
                            <select
                                id="user-select"
                                value={selectedUser?.id || ''}
                                onChange={handleUserSelect}
                                className="text-input"
                            >
                                <option value="">-- Select a student --</option>
                                {allUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.username}) - {user.instrument}
                                    </option>
                                ))}
                            </select>
                            {selectedUser && (
                                <div className="selected-user valid">
                                    <strong>✓ Selected:</strong> {selectedUser.firstName} {selectedUser.lastName} — {selectedUser.instrument}
                                </div>
                            )}
                        </div>

                        <div className="status-help">
                            <p>
                                {UserManager.isDirector
                                    ? 'As Director, you may evaluate any station.'
                                    : `Your current status for this station is ${getStatusLabel(scoreToStatus(getLatestStationEvaluation(myEvaluations, currentStationId)?.score))}.`}
                            </p>
                        </div>

                        {/* Criteria radio buttons */}
                        {criteria.length > 0 ? (
                            <div className="criteria-form-list">
                                <h3>Criteria</h3>
                                {criteria.map((criterion, idx) => (
                                    <div key={idx} className="criteria-form-row">
                                        <div className="criteria-name">{criterion.name}</div>
                                        <div className="criteria-radio-group">
                                            {(['developing', 'proficient', 'mastery'] as CriterionLevel[]).map((level) => (
                                                <label key={level} className={`radio-label radio-${level} ${criterion.level === level ? 'radio-active' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name={`criterion-${idx}`}
                                                        value={level}
                                                        checked={criterion.level === level}
                                                        onChange={() => handleLevelChange(idx, level)}
                                                    />
                                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="message error-message">
                                No criteria defined for this station yet. A director can add criteria under Admin → Stations.
                            </div>
                        )}

                        {/* Feedback checkboxes */}
                        <div className="feedback-section">
                            <h3>Areas to Work On (check all that apply)</h3>
                            {feedbackOptions.length > 0 ? (
                                <div className="feedback-grid">
                                    {feedbackOptions.map((item) => (
                                        <label key={item} className="feedback-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={feedbackChecked.has(item)}
                                                onChange={() => toggleFeedback(item)}
                                            />
                                            {item}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-hint">No feedback items configured for this station. A director can add them under Admin → Stations.</p>
                            )}
                        </div>

                        {/* Overall status summary */}
                        {criteria.length > 0 && (
                            <div className={`eval-status-summary ${passed ? 'eval-passed' : 'eval-not-passed'}`}>
                                <div className="eval-status-line">
                                    <span className="eval-status-label">Lowest criterion reached:</span>
                                    <span className={`eval-status-badge badge-${overallStatus}`}>
                                        {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                                    </span>
                                </div>
                                <div className="eval-pass-line">
                                    {passed
                                        ? '✅ PASSED — All criteria at proficient or higher'
                                        : '❌ NOT YET PASSED — One or more criteria are developing'}
                                </div>
                            </div>
                        )}

                        {/* Additional comments */}
                        <div className="form-group">
                            <label htmlFor="comments">Additional Comments (Optional):</label>
                            <textarea
                                id="comments"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="text-input"
                                rows={3}
                                placeholder="Any additional notes for the student..."
                            />
                        </div>

                        {targetAtMastery && (
                            <div className="message error-message">
                                This student has already reached mastery at this station.
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
                            disabled={isSubmitting || !selectedUser || targetAtMastery || !currentEligibility || criteria.length === 0}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                        </button>
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .criteria-form-row {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #eee;
                }
                .criteria-name {
                    font-weight: 600;
                    font-size: 1rem;
                }
                .criteria-radio-group {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .radio-label {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.35rem 0.75rem;
                    border-radius: 20px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.15s;
                }
                .radio-label input[type="radio"] { display: none; }
                .radio-developing { border-color: #c084fc; color: #7e22ce; background: #faf5ff; }
                .radio-proficient { border-color: #60a5fa; color: #1d4ed8; background: #eff6ff; }
                .radio-mastery { border-color: #fbbf24; color: #b45309; background: #fffbeb; }
                .radio-active.radio-developing { background: #c084fc; color: white; }
                .radio-active.radio-proficient { background: #60a5fa; color: white; }
                .radio-active.radio-mastery { background: #fbbf24; color: white; }

                .feedback-section { margin-top: 1.5rem; }
                .feedback-section h3 { margin-bottom: 0.75rem; }
                .feedback-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 0.5rem;
                }
                .feedback-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.25rem 0;
                }

                .eval-status-summary {
                    margin: 1.25rem 0;
                    padding: 1rem 1.25rem;
                    border-radius: 10px;
                    border: 2px solid;
                }
                .eval-passed { border-color: #22c55e; background: #f0fdf4; }
                .eval-not-passed { border-color: #ef4444; background: #fef2f2; }
                .eval-status-line { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
                .eval-status-label { font-weight: 600; }
                .eval-status-badge {
                    padding: 0.2rem 0.65rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                .badge-developing { background: #c084fc; color: white; }
                .badge-proficient { background: #60a5fa; color: white; }
                .badge-mastery { background: #fbbf24; color: white; }
                .eval-pass-line { font-weight: 600; font-size: 0.95rem; }
            `}</style>
        </>
    );
}
