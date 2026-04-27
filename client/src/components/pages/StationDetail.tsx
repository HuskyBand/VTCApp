import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { useState, useEffect } from "react";

export default function StationDetail() {
    const { id } = useParams();
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        loadEvaluations();
    }, [id]);

    // Refresh evaluations periodically
    useEffect(() => {
        const interval = setInterval(loadEvaluations, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const loadEvaluations = async () => {
        if (UserManager.isLoggedIn) {
            const userEvaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
            const stationEvaluations = userEvaluations.filter((evaluation: any) => evaluation.stationId === parseInt(id!));
            setEvaluations(stationEvaluations);
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
                                            <span className="evaluation-score">Score: {evaluations[0].score}%</span>
                                            <span className="evaluation-date">
                                                {new Date(evaluations[0].createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
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
                                            <span className="evaluation-score">Score: {evaluation.score}%</span>
                                            <span className="evaluation-date">
                                                {new Date(evaluation.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
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