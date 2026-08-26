import { useParams, useSearchParams, useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import { useState, useEffect, useRef, useCallback } from "react";
import UserManager from "@client/stores/UserManager";
import type { User } from "@api/user/User";
import type { StationRole } from "@api/station/StationRole";
import {
    getStatusLabel,
    isMasteryLocked,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";
import jsQR from "jsqr";

type CriterionLevel = 'novice' | 'developing' | 'proficient' | 'mastery';

type Criterion = {
    name: string;
    level: CriterionLevel;
};

const levelScore: Record<CriterionLevel, number> = {
    novice: 25,
    developing: 50,
    proficient: 75,
    mastery: 100,
};

export default function EvaluationForm() {
    const { stationId } = useParams();
    const nav = useNavigate();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [feedbackOptions, setFeedbackOptions] = useState<string[]>([]);
    const [stationName, setStationName] = useState<string | null>(null);
    const [feedbackChecked, setFeedbackChecked] = useState<Set<string>>(new Set());
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [targetEvaluations, setTargetEvaluations] = useState<EvaluationRecord[]>([]);
    const [stationRole, setStationRole] = useState<StationRole>('participant');
    const [queue, setQueue] = useState<Array<{ id: number; name: string; userId: number; position: number; requestedAt: string }> | null>(null);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');
    
    // QR scanner state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scannedUser, setScannedUser] = useState<{ id: number; name: string } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<number | null>(null);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        loadUsers();
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
            setCriteria(station.criteria?.length > 0 ? station.criteria.map((name) => ({ name, level: 'novice' })) : []);
            setFeedbackOptions(station.feedbackItems ?? []);
            setStationRole(station.role);
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

    const handleTakeNext = async () => {
        try {
            const result = await UserManager.takeNextStationQueue(currentStationId);
            if (result.success && result.removedEntry) {
                const found = allUsers.find((u) => u.id === result.removedEntry!.userId);
                if (found) setSelectedUser(found);
                setMessage('');
                return;
            }
            setQueueError(result.message ?? 'Unable to pull next student from the queue.');
            setQueueMessage('');
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Unable to pull next student from the queue.');
            setQueueMessage('');
        }
    };

    useEffect(() => {
        const studentId = Number(searchParams.get('studentId'));
        if (studentId && allUsers.length > 0) {
            const found = allUsers.find((user) => user.id === studentId);
            if (found) setSelectedUser(found);
        }
    }, [allUsers, searchParams]);

    // Clean up camera on unmount
    useEffect(() => {
        return () => stopScanner();
    }, []);

    const stopScanner = () => {
        if (scanIntervalRef.current !== null) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    const startScanner = useCallback(async () => {
        setScanError('');
        setScannedUser(null);
        setScannerOpen(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            scanIntervalRef.current = window.setInterval(() => {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    const userId = parseInt(code.data);
                    if (!isNaN(userId) && userId > 0) {
                        stopScanner();
                        setScannerOpen(false);
                        handleScannedUserId(userId);
                    }
                }
            }, 200);
        } catch {
            setScanError('Camera access denied or unavailable.');
            setScannerOpen(false);
        }
    }, []);

    const handleScannedUserId = async (userId: number) => {
        try {
            const users = await UserManager.getAllUsers();
            const found = users.find((u) => u.id === userId);
            if (found) {
                setScannedUser({ id: found.id!, name: `${found.firstName} ${found.lastName}` });
            } else {
                setScanError(`No student found with ID ${userId}.`);
            }
        } catch {
            setScanError('Failed to look up scanned student.');
        }
    };

    const handleEvaluateScanned = () => {
        if (!scannedUser) return;
        const found = allUsers.find((u) => u.id === scannedUser.id);
        if (found) {
            setSelectedUser(found);
            setScannedUser(null);
        }
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
        if (criteria.length === 0) return 'novice';
        const order: CriterionLevel[] = ['novice', 'developing', 'proficient', 'mastery'];
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
    const currentEligibility = stationRole === 'evaluator';
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
                criteria.map((c) => {
                    return {
                        name: c.name,
                        status: c.level
                    };
                }),
                Array.from(feedbackChecked),
                overallStatus
            );

            if (success) {
                nav(`/station/${currentStationId}`);
                return;
            } else {
                setMessage('Failed to submit evaluation. Please try again.');
            }
        } catch {
            setMessage('An error occurred while submitting. Please try again.');
        }

        setIsSubmitting(false);
    };
    
    useEffect(() => {
        const loadQueue = async () => {
            if (!UserManager.isLoggedIn) {
                setQueue([]);
                return;
            }
            try {
                const queueItems = await UserManager.getStationQueue(currentStationId);
                setQueue(queueItems);
                setQueueError('');
            } catch {
                setQueue([]);
                setQueueError('Unable to load the station queue.');
            }
        };
        loadQueue();
        const interval = setInterval(loadQueue, 5000);
        return () => clearInterval(interval);
    }, [currentStationId]);

    return (
        <>
            <section id="center">
                <div>
                    <h1 className="evaluation-headertext">Evaluate</h1>
                    <h2 className="evaluation-subheadertext">{stationName ?? 'Loading...'}</h2>
                    <div className="evaluation-form">

                        {/* Student selection */}
                        <div className="form-group">
                            <select
                                id="user-select"
                                value={selectedUser?.id || ''}
                                onChange={handleUserSelect}
                                className="text-input"
                            >
                                <option value="">-- Manually select a student --</option>
                                {allUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.username}) - {user.instrument}
                                    </option>
                                ))}
                            </select>
                            {!selectedUser && (<>
                                <div className="queue-panel">
                                    <h3>Queue</h3>
                                    {queueError && <div className="error-message">{queueError}</div>}
                                    {queueMessage && <div className="success-message">{queueMessage}</div>}
                                    {queue ?
                                        <>
                                            <p>{queue.length ? `${queue.length} student${queue.length != 1 ? 's' : ''} waiting.` : 'No one is waiting in the queue yet.'}</p>
                                            {queue.length !== 0 && (<button
                                                className="button primary submit-btn"
                                                onClick={handleTakeNext}
                                                disabled={!queue.length}
                                            >
                                                Pull Next Student
                                            </button>)}
                                        </>
                                     : <p>Loading...</p>
                                    }
                                </div>

                                {/* QR Scanner */}
                                <div className="qr-scan-panel">
                                    <h3>Scan Student QR Code</h3>
                                    {scanError && <div className="message error-message">{scanError}</div>}
                                    {scannedUser && (
                                        <div className="scanned-student">
                                            <strong>Scanned:</strong> {scannedUser.name}
                                            <button className="button primary" onClick={handleEvaluateScanned}>
                                                Evaluate Now
                                            </button>
                                        </div>
                                    )}
                                    {!scannerOpen ? (
                                        <button className="button secondary" onClick={startScanner}>
                                            Open QR Scanner
                                        </button>
                                    ) : (
                                        <div className="scanner-container">
                                            <video ref={videoRef} className="scanner-video" playsInline muted />
                                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                                            <button className="button secondary" onClick={() => { stopScanner(); setScannerOpen(false); }}>
                                                Close Scanner
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>)}
                        </div>

                        {targetAtMastery && (
                            <div className="message error-message fit">
                                This student has already reached mastery at this station.
                            </div>
                        )}

                        {/* Criteria radio buttons */}
                        {selectedUser && !targetAtMastery && (<>
                            {criteria.length > 0 ? (
                                <div className="criteria-form-list">
                                    <h3>Criteria</h3>
                                    <div className="criteria-legend">
                                        <span>(N)ovice</span><span>(D)eveloping</span><span>(P)roficient</span><span>(M)astery</span>
                                    </div>
                                    {criteria.map((criterion, idx) => (
                                        <div key={idx} className="criteria-form-row">
                                            <div className="criteria-name">{criterion.name}</div>
                                            <div className="criteria-radio-group">
                                                {(['novice', 'developing', 'proficient', 'mastery'] as CriterionLevel[]).map((level) => (
                                                    <label key={level} className={`radio-label radio-${level} ${criterion.level === level ? 'radio-active' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name={`criterion-${idx}`}
                                                            value={level}
                                                            checked={criterion.level === level}
                                                            onChange={() => handleLevelChange(idx, level)}
                                                        />
                                                        {level.charAt(0).toUpperCase()}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="message error-message">
                                    No criteria defined for this station yet.
                                </div>
                            )}

                            {/* Feedback checkboxes */}
                            <div className="feedback-section">
                                {feedbackOptions.length > 0 && (
                                    <>
                                        <h3>Areas to Work On</h3>
                                        <div className="feedback-grid">
                                            {feedbackOptions.map((item) => (
                                                <label key={item} className="feedback-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        className="feedback-checkbox"
                                                        checked={feedbackChecked.has(item)}
                                                        onChange={() => toggleFeedback(item)}
                                                    />
                                                    {item}
                                                </label>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Additional comments */}
                            <div className="form-group additional-comments">
                                <h3>Additional Comments (optional)</h3>
                                <textarea
                                    id="comments"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    className="text-input"
                                    rows={3}
                                    placeholder="Any additional notes for the student..."
                                />
                            </div>

                            {/* Overall status summary */}
                            {criteria.length > 0 && (
                                <div className={`eval-status-summary`}>
                                    <h3>Summary</h3>
                                    <div
                                        className={`station-row ${overallStatus}`}
                                    >
                                        <div className="station-info">
                                            <div className={`station-name ${passed ? 'eval-passed' : 'eval-not-passed'}`}>
                                                {passed ? 'PASSED' : 'NOT PASSED'}
                                            </div>
                                            <div className={`station-status ${overallStatus}`}>
                                                {overallStatus === 'mastery' ?
                                                    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--mastery-color)">
                                                        <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" fill="var(--mastery-color)" stroke="var(--mastery-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                    </svg> : (overallStatus === 'proficient' ?
                                                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--proficient-color)">
                                                    <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="var(--proficient-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                                </svg> : <></>)}
                                                {getStatusLabel(overallStatus)}
                                            </div>
                                        </div>
                                        <progress className={`station-progress ${overallStatus}`} value={levelScore[overallStatus] / 75}></progress>
                                    </div>
                                </div>
                            )}

                            <button
                                className="button primary submit-btn"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !selectedUser || targetAtMastery || !currentEligibility || criteria.length === 0}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                        </>)}

                        {message && (
                            <div className={`message ${message.includes('success') ? 'success-message' : 'error-message'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`

                .feedback-section { margin: 0 auto; margin-top: 1.5rem; max-width: 500px; }
                .feedback-section h3 { margin-bottom: 0.75rem; }
                .feedback-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 0.5rem;
                    max-width: fit-content;
                    margin: 0 auto;
                }
                .feedback-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.9rem;
                    cursor: pointer;
                    padding: 0.25rem 0;
                }

                h3 {
                    margin-top: 2.5rem;
                    margin-bottom: 0;
                }

                .eval-status-summary {
                    margin: 1.25rem 0;
                }
                .eval-passed { color: #22c55e; }
                .eval-not-passed { color: red; }

                .additional-comments {
                    max-width: 500px;
                    margin: 0 auto;
                }
            `}</style>
        </>
    );
}
