import { useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";
import PermissionManager from "@client/stores/PermissionManager";
import { useState, useEffect } from "react";
import {
    canEvaluateStation,
    canTeachStation,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";

type Station = {
    id: number;
    name: string;
};

const stations: Station[] = [
    { id: 1, name: 'Station 1' },
    { id: 2, name: 'Station 2' },
    { id: 3, name: 'Station 3' },
    { id: 4, name: 'Station 4' },
    { id: 5, name: 'Station 5' },
    { id: 6, name: 'Station 6' },
];

export default function EvaluateSelectStation() {
    const nav = useNavigate();
    const [selectedStation, setSelectedStation] = useState<number | null>(null);
    const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
    const [queue, setQueue] = useState<Array<{ id: number; name: string; position: number; requestedAt: string }>>([]);
    const [queueError, setQueueError] = useState('');
    const [queueMessage, setQueueMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!UserManager.isLoggedIn) {
                return;
            }
            try {
                const result = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
                setEvaluations(result);
            } catch (err) {
                setError('Unable to load your station progress.');
            }
        };

        load();
    }, []);

    useEffect(() => {
        const loadQueue = async () => {
            if (!selectedStation || !UserManager.isLoggedIn) {
                setQueue([]);
                return;
            }

            try {
                const queueItems = await UserManager.getStationQueue(selectedStation);
                setQueue(queueItems);
                setQueueError('');
            } catch (err) {
                setQueue([]);
                setQueueError('Unable to load the station queue.');
            }
        };

        loadQueue();
    }, [selectedStation]);

    const handleSelect = () => {
        if (!selectedStation) {
            return;
        }

        const canEvaluate = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(evaluations, selectedStation);
        const canTeach = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canTeachStation(evaluations, selectedStation);

        if (!canEvaluate && !canTeach) {
            setError('You are not yet eligible to evaluate this station. Reach mastery and pass the next station first.');
            return;
        }

        nav(`/evaluate/station/${selectedStation}`);
    };

    const handleTakeNext = async () => {
        if (!selectedStation) {
            return;
        }

        try {
            const result = await UserManager.takeNextStationQueue(selectedStation);
            if (result.success && result.removedEntry) {
                nav(`/evaluate/station/${selectedStation}?studentId=${result.removedEntry.userId}`);
                return;
            }

            setQueueError(result.message ?? 'Unable to pull next student from the queue.');
            setQueueMessage('');
        } catch (err) {
            setQueueError(err instanceof Error ? err.message : 'Unable to pull next student from the queue.');
            setQueueMessage('');
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Select Station</h1>
                    <h2>Choose the station you want to evaluate or teach</h2>
                    {error && <div className="error-message">{error}</div>}
                    <div className="stations-select-list">
                        {stations.map((station) => {
                            const canEvaluate = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canEvaluateStation(evaluations, station.id);
                            const canTeach = PermissionManager.canViewAdmin() || PermissionManager.canEvaluate() || canTeachStation(evaluations, station.id);
                            return (
                                <div
                                    key={station.id}
                                    className={`station-select-row ${selectedStation === station.id ? 'selected' : ''} ${canEvaluate || canTeach ? '' : 'disabled'}`}
                                    onClick={() => {
                                        if (canEvaluate || canTeach) {
                                            setSelectedStation(station.id);
                                        }
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="station"
                                        value={station.id}
                                        checked={selectedStation === station.id}
                                        onChange={() => {
                                            if (canEvaluate || canTeach) {
                                                setSelectedStation(station.id);
                                            }
                                        }}
                                        disabled={!canEvaluate && !canTeach}
                                    />
                                    <label>{station.name}</label>
                                </div>
                            );
                        })}
                    </div>
                    {selectedStation && (
                        <div className="queue-panel">
                            <h3>Queue for Station {selectedStation}</h3>
                            {queueError && <div className="error-message">{queueError}</div>}
                            {queueMessage && <div className="success-message">{queueMessage}</div>}
                            <p>{queue.length ? `There are ${queue.length} people waiting.` : 'No one is waiting in the queue yet.'}</p>
                            {queue.length > 0 && (
                                <ol>
                                    {queue.map((entry) => (
                                        <li key={entry.id}>{entry.position}. {entry.name} {entry.position === 1 ? '(next)' : ''}</li>
                                    ))}
                                </ol>
                            )}
                            <button
                                className="btn submit-btn"
                                onClick={handleTakeNext}
                                disabled={!queue.length}
                            >
                                Pull Next Student
                            </button>
                        </div>
                    )}
                    <button
                        className="btn submit-btn"
                        onClick={handleSelect}
                        disabled={!selectedStation}
                    >
                        Continue
                    </button>
                </div>
            </section>
            <BottomNav />
        </>
    );
}
