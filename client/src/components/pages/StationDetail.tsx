import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { useState, useEffect } from "react";

export default function StationDetail() {
    const { id } = useParams();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [queue, setQueue] = useState<Array<{ id: number; userId: number; name: string; position: number; requestedAt: string }>>([]);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');

    useEffect(() => {
        loadEvaluations();
        loadQueue();
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

    const loadQueue = async () => {
        if (!id || !UserManager.isLoggedIn) {
            return;
        }

        try {
            const stationId = parseInt(id);
            const queueItems = await UserManager.getStationQueue(stationId);
            setQueue(queueItems);
            setQueueError('');
        } catch (err) {
            setQueueError('Failed to load queue status.');
        }
    };

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

    const getLatestStatus = () => {
        if (evaluations.length === 0) return 'not_started';
        const latest = evaluations[0]; // Assuming sorted by date descending
        if (latest.score >= 80) return 'completed';
        if (latest.score >= 50) return 'in_progress';
        return 'not_started';
    };

    const getStatusIndicator = (status: string) => {
        switch (status) {
            case 'completed': return '🟢';
            case 'in_progress': return '🟡';
            case 'not_started': return '🔴';
            default: return '🔴';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Completed';
            case 'in_progress': return 'In Progress';
            case 'not_started': return 'Not Yet Started';
            default: return 'Not Yet Started';
        }
    };

    // Mock data
    const station = { name: `Station ${id}`, criteria: [
        { name: 'Criteria 1', items: ['Not yet', 'In progress', 'Satisfactory', 'Exceeding Standard'] },
        { name: 'Criteria 2', items: ['Not yet', 'In progress', 'Satisfactory', 'Exceeding Standard'] },
        // Add more
    ] };

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
                                                        <li key={index}>{`Criteria ${index + 1}: ${status}`}</li>
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
                                                        <li key={index}>{`Criteria ${index + 1}: ${status}`}</li>
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

                    <div className="criteria-list">
                        {station.criteria.map((crit, idx) => (
                            <div key={idx} className="criteria-section">
                                <h3>{crit.name}</h3>
                                <ul>
                                    {crit.items.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="rubric">
                        <h3>Rubric</h3>
                        <ul>
                            <li>Guidance text 1</li>
                            <li>Guidance text 2</li>
                        </ul>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}