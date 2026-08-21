import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { useState, useEffect } from "react";
import { isMasteryLocked, scoreToStatus, getStatusLabel, type EvaluationStatus } from "@client/utils/evaluationHelpers";
import type { StationRole } from "@api/station/StationRole";

export default function StationDetail() {
    const { id } = useParams();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [queue, setQueue] = useState<Array<{ id: number; userId: number; name: string; position: number; requestedAt: string }>>([]);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');
    const [station, setStation] = useState<{ id: number; name: string; criteria: string[]; role: StationRole; instructorNotes?: string[] }>({ id: Number(id), name: `Station ${id}`, criteria: [], role: 'participant' });

    useEffect(() => {
        loadEvaluations();
        loadQueue();
        loadStation();
    }, [id]);

    // Refresh evaluations periodically
    useEffect(() => {
        const interval = setInterval(() => {
            loadEvaluations();
            loadQueue();
        }, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const loadEvaluations = async () => {
        if (UserManager.isLoggedIn) {
            const userEvaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
            const stationEvaluations = userEvaluations.filter((evaluation: any) => evaluation.stationId === parseInt(id!));
            setEvaluations(stationEvaluations);
        }
    };

    const loadStation = async () => {
        if (!id) return;
        const data = await UserManager.getStation(Number(id));
        if (data) setStation(data);
    };

    const loadQueue = async () => {
        if (!id || !UserManager.isLoggedIn) {
            return;
        }

        try {
            const stationId = parseInt(id);
            const queueItems = await UserManager.getStationQueue(stationId);
            setQueue(queueItems);
            setQueueError('');
            if (!queueItems.some((entry) => entry.userId === UserManager.currentUser.id)) {
                setQueueMessage('');
            }
        } catch (err) {
            setQueueError('Failed to load queue status.');
        }
    };

    const atMastery = isMasteryLocked(evaluations, Number(id));

    const isInQueue = () => queue.some((entry) => entry.userId === UserManager.currentUser.id);
    const queuePosition = () => {
        const entry = queue.find((entry) => entry.userId === UserManager.currentUser.id);
        return entry?.position ?? null;
    };

    const joinQueue = async () => {
        if (!id) return;
        try {
            const stationId = parseInt(id);
            const result = await UserManager.joinStationQueue(stationId);
            if (result.success) {
                setQueueMessage(result.message ?? 'You have been added to the station queue.');
                setQueueError('');
                await loadQueue();
            } else {
                setQueueError(result.message ?? 'Could not join the queue.');
                setQueueMessage('');
            }
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Could not join the queue.');
            setQueueMessage('');
        }
    };

    const leaveQueue = async () => {
        if (!id) return;
        try {
            const stationId = parseInt(id);
            const result = await UserManager.leaveStationQueue(stationId);
            if (result.success) {
                setQueueMessage(result.message ?? 'You have been removed from the queue.');
                setQueueError('');
                await loadQueue();
            } else {
                setQueueError(result.message ?? 'Could not leave the queue.');
                setQueueMessage('');
            }
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Could not leave the queue.');
            setQueueMessage('');
        }
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const getLatestStatus = (): EvaluationStatus => {
        if (evaluations.length === 0) return 'not_started';
        return scoreToStatus(evaluations[0].score); // evaluations[0] is the latest, sorted by date descending
    };

    const getStatusIndicator = (status: EvaluationStatus) => {
        switch (status) {
            case 'mastery': return '🟢';
            case 'satisfactory': return '🟡';
            case 'developing': return '🟠';
            case 'not_started': return '🔴';
            default: return '🔴';
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>{station.name}</h1>
                    <div className="station-status">
                        <div className="status-indicator">{getStatusIndicator(getLatestStatus())}</div>
                        <div className="status-text">
                            <div className="status-label">Current Status</div>
                            <div className="status-value">{getStatusLabel(getLatestStatus())}</div>
                        </div>
                    </div>

                    {station.criteria.length > 0 && (
                        <div className="criteria-summary">
                            <h3>What to strive for</h3>
                            <ul>
                                {station.criteria.map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {station.role !== 'participant' && station.instructorNotes && station.instructorNotes.length > 0 && (
                        <div className="instructor-notes-summary">
                            <h3>Instructor Notes</h3>
                            <ul>
                                {station.instructorNotes.map((note) => (
                                    <li key={note}>{note}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="queue-panel">
                        <h3>Evaluation Queue</h3>
                        {queueError && <div className="error-message">{queueError}</div>}
                        {queueMessage && <div className="success-message">{queueMessage}</div>}
                        <div className="queue-status">
                            {isInQueue() ? (
                                <p>You are in the queue at position {queuePosition()}.</p>
                            ) : (
                                <p>You are not in the queue.</p>
                            )}
                        </div>
                        <div className="queue-actions">
                            {isInQueue() ? (
                                <button className="button secondary" onClick={leaveQueue}>Leave Queue</button>
                            ) : atMastery ? (
                                <p className="mastery-note">You've already reached mastery for this station.</p>
                            ) : (
                                <button className="button primary" onClick={joinQueue}>Join Queue</button>
                            )}
                        </div>
                        {queue.length > 0 && (
                            <div className="queue-list">
                                <h4>Current queue</h4>
                                <ol>
                                    {queue.map((entry) => (
                                        <li key={entry.id}>{entry.name} {entry.position === 1 ? '(next)' : ''}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>

                    {!showHistory ? (
                        <div className="evaluated-view">
                            {evaluations.length > 0 ? (
                                <div className="latest-evaluation">
                                    <div className="evaluation-header-section">
                                        <h3>Latest Evaluation</h3>
                                        <button
                                            className="button secondary refresh-btn"
                                            onClick={loadEvaluations}
                                            title="Refresh evaluations"
                                        >
                                            ↻ Refresh
                                        </button>
                                    </div>
                                    <div className="evaluation-item latest">
                                        <div className="evaluation-header">
                                            <span className="evaluation-date">
                                                {new Date(evaluations[0].createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {evaluations[0].criteria && evaluations[0].criteria.length > 0 ? (
                                            <div className="evaluation-criteria-list">
                                                <h4>Criteria Results</h4>
                                                <ul>
                                                    {evaluations[0].criteria.map((status: string, index: number) => (
                                                        <li key={index}>{`Criteria ${index + 1}: ${capitalize(status)}`}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <span className="evaluation-score">Score: {evaluations[0].score}%</span>
                                        )}
                                        {evaluations[0].comments && (
                                            <div className="evaluation-comments">
                                                {evaluations[0].comments}
                                            </div>
                                        )}
                                    </div>
                                    {evaluations.length > 1 && (
                                        <button
                                            className="button secondary history-btn"
                                            onClick={() => setShowHistory(true)}
                                        >
                                            📋 View Full History ({evaluations.length} evaluations)
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="no-evaluations">
                                    <p>No evaluations yet for this station.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        evaluations.length > 0 && (
                            <div className="evaluation-history">
                                <div className="history-header">
                                    <h3>Evaluation History</h3>
                                    <button
                                        className="button secondary back-btn"
                                        onClick={() => setShowHistory(false)}
                                    >
                                        ← Back to Latest
                                    </button>
                                </div>
                                {evaluations.map((evaluation) => (
                                    <div key={evaluation.id} className="evaluation-item">
                                        <div className="evaluation-header">
                                            <span className="evaluation-date">
                                                {new Date(evaluation.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {evaluation.criteria && evaluation.criteria.length > 0 ? (
                                            <div className="evaluation-criteria-list">
                                                <h4>Criteria Results</h4>
                                                <ul>
                                                    {evaluation.criteria.map((status: string, index: number) => (
                                                        <li key={index}>{`Criteria ${index + 1}: ${capitalize(status)}`}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <span className="evaluation-score">Score: {evaluation.score}%</span>
                                        )}
                                        {evaluation.comments && (
                                            <div className="evaluation-comments">
                                                {evaluation.comments}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                </div>
            </section>
            <BottomNav />
        </>
    );
}