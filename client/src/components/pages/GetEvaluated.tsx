import { useEffect, useState } from "react";
import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";

type QueueEntry = {
    id: number;
    stationId: number;
    userId: number;
    name: string;
    position: number;
    requestedAt: string;
    status: string;
};

export default function GetEvaluated() {
    const { id } = useParams();
    const stationId = Number(id);
    const [queue, setQueue] = useState<QueueEntry[]>([]);
    const [criteria, setCriteria] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const loadStationData = async () => {
        if (!stationId) {
            setLoading(false);
            return;
        }

        const [queueResponse, stationResponse] = await Promise.all([
            UserManager.getStationQueue(stationId),
            UserManager.getStationById(stationId)
        ]);

        setQueue(queueResponse);
        setCriteria(Array.isArray(stationResponse?.criteria) ? stationResponse.criteria : []);
        setLoading(false);
    };

    useEffect(() => {
        loadStationData();
    }, [stationId]);

    const refresh = async () => {
        setLoading(true);
        await loadStationData();
    };

    const handleJoin = async () => {
        if (!stationId) {
            return;
        }
        const result = await UserManager.joinStationQueue(stationId);
        setActionMessage(result.message ?? 'Joined queue.');
        await refresh();
    };

    const handleLeave = async () => {
        if (!stationId) {
            return;
        }
        const result = await UserManager.leaveStationQueue(stationId);
        setActionMessage(result.message ?? 'Left queue.');
        await refresh();
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Station {stationId} - Get Evaluated</h1>
                    {loading ? (
                        <p>Loading queue and criteria...</p>
                    ) : (
                        <>
                            {actionMessage && <div className="action-message">{actionMessage}</div>}
                            <div className="queue-actions">
                                <button className="btn" onClick={handleJoin}>Join Queue</button>
                                <button className="btn secondary" onClick={handleLeave}>Leave Queue</button>
                                <button className="btn tertiary" onClick={refresh}>Refresh</button>
                            </div>
                            <div className="queue-list">
                                <h2>Station Queue</h2>
                                {queue.length === 0 ? (
                                    <p>The queue is empty.</p>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th>Status</th>
                                                <th>Requested</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queue.map((entry) => (
                                                <tr key={entry.id}>
                                                    <td>{entry.position}</td>
                                                    <td>{entry.name}</td>
                                                    <td>{entry.status}</td>
                                                    <td>{new Date(entry.requestedAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="criteria-list">
                                <h2>Criteria</h2>
                                {criteria.length === 0 ? (
                                    <p>No station criteria are configured yet.</p>
                                ) : (
                                    <ul>
                                        {criteria.map((criterion, idx) => (
                                            <li key={idx}>{criterion}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>
            <BottomNav />
        </>
    );
}
