import { useEffect, useState } from "react";
import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import { scoreToStatus } from "@client/utils/evaluationHelpers";

type EvaluationRecord = {
    id?: number;
    stationId: number;
    score?: number;
    comments?: string;
    criteria?: string[];
    createdAt?: string;
};

export default function StationEvaluationSearch() {
    const { id } = useParams();
    const stationId = Number(id);
    const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (!stationId || !UserManager.isLoggedIn) {
                setEvaluations([]);
                setLoading(false);
                return;
            }

            const allEvaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
            const stationHistory = allEvaluations
                .filter((evaluation) => evaluation.stationId === stationId)
                .sort((a, b) => {
                    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return bTime - aTime;
                });

            setEvaluations(stationHistory);
            setLoading(false);
        };

        loadHistory();
    }, [stationId]);

    return (
        <>
            <section id="center">
                <div>
                    <h1>Station {stationId} History</h1>
                    {loading ? (
                        <p>Loading history...</p>
                    ) : (
                        <>
                            {evaluations.length === 0 ? (
                                <p>No past evaluations found for this station.</p>
                            ) : (
                                <div className="history-list">
                                    {evaluations.map((evaluation, idx) => (
                                        <div key={evaluation.id ?? idx} className="history-card">
                                            <div className="history-header">
                                                <span className="history-date">{evaluation.createdAt ? new Date(evaluation.createdAt).toLocaleString() : 'Unknown date'}</span>
                                                <span className="history-score">{evaluation.score ?? 'No score'}</span>
                                                <span className="history-status">{scoreToStatus(evaluation.score)}</span>
                                            </div>
                                            <p className="history-comments">{evaluation.comments ?? 'No comments provided.'}</p>
                                            <div className="criteria-list">
                                                <h3>Criteria</h3>
                                                {evaluation.criteria && evaluation.criteria.length > 0 ? (
                                                    <ul>
                                                        {evaluation.criteria.map((criterion, critIdx) => (
                                                            <li key={critIdx}>{criterion}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No criterion details recorded.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
            <BottomNav />
        </>
    );
}
