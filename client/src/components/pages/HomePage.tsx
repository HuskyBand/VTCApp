import { useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import PermissionManager, { UserPermission } from "@client/stores/PermissionManager";
import UserManager from '@client/stores/UserManager';
import { useState, useEffect } from "react";
import {
    getLatestStationEvaluation,
    hasPassedStation,
    scoreToStatus,
    type EvaluationRecord,
    type EvaluationStatus,
} from '@client/utils/evaluationHelpers';

type Station = {
    id: number;
    name: string;
    criteria: string[];
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

const getStatusLabel = (status: EvaluationStatus) => {
    switch (status) {
        case 'mastery': return 'Completed';
        case 'satisfactory': return 'In Progress';
        case 'developing': return 'Developing';
        case 'not_started': return 'Not Yet Started';
        default: return 'Not Yet Started';
    }
};

// Assumed to be logged in if this page is loaded.
export default function HomePage() {
    const nav = useNavigate();
    const [permission, setPermission] = useState(PermissionManager.permission);
    const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
    const [notifications, setNotifications] = useState<Array<{ id: number; title: string; message: string; senderName: string; createdAt: string }>>([]);
    const [showAllNotifs, setShowAllNotifs] = useState(false);
    const [stations, setStations] = useState<Station[]>([]);
    const [stationsError, setStationsError] = useState(false);

    useEffect(() => {
        loadEvaluations();
        loadNotifications();
        loadStations();
    }, []);

    const loadStations = async () => {
        const data = await UserManager.getStations();
        if (data === null) {
            setStationsError(true);
            return;
        }
        setStationsError(false);
        setStations(data);
    };

    const loadEvaluations = async () => {
        if (UserManager.isLoggedIn) {
            const userEvaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
            setEvaluations(userEvaluations);
        }
    };

    const loadNotifications = async () => {
        if (!UserManager.isLoggedIn) {
            return;
        }

        const latestNotifications = await UserManager.getNotifications();
        setNotifications(latestNotifications);
    };

    const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPermission = e.target.value as UserPermission;
        PermissionManager.permission = newPermission;
        setPermission(newPermission);
    };

    const getStationStatus = (stationId: number): EvaluationStatus => {
        const latest = getLatestStationEvaluation(evaluations, stationId);
        return scoreToStatus(latest?.score);
    };

    const isStationUnlocked = (stationId: number): boolean => {
        if (UserManager.isTA || UserManager.isDirector || PermissionManager.canViewAdmin()) {
            return true;
        }
        const sortedStations = [...stations].sort((a, b) => a.id - b.id);
        const index = sortedStations.findIndex((s) => s.id === stationId);
        if (index <= 0) {
            return true;
        }
        return hasPassedStation(evaluations, sortedStations[index - 1].id);
    };

    return (
        <>
            <section id="center">
                <div>
                    <div className="header-with-dropdown">
                        <div>
                            <h1>Home</h1>
                            <h2>Welcome, {UserManager.currentUser.firstName}!</h2>
                        </div>
                        <div className="permission-selector">
                            <label htmlFor="permission">Override Permission (temporary):</label>
                            <select
                                id="permission"
                                value={permission}
                                onChange={handlePermissionChange}
                                className="permission-dropdown"
                            >
                                {PermissionManager.getAllPermissions().map(perm => (
                                    <option key={perm} value={perm}>
                                        {PermissionManager.getPermissionLabel(perm as UserPermission)}
                                    </option>
                                ))}
                            </select>
                            <p className="permission-note">This override is only for testing evaluator and director screens. It will be removed later.</p>
                        </div>
                    </div>

                    {notifications.length > 0 && (() => {
                        const latest = notifications[0];
                        const rest = notifications.slice(1);
                        return (
                            <div className="home-notif-section">
                                {/* Most recent — prominent card */}
                                <div className="notif-latest-card">
                                    <div className="notif-latest-badge">📣 Latest</div>
                                    <div className="notif-latest-title">{latest.title}</div>
                                    <div className="notif-latest-body">{latest.message}</div>
                                    <div className="notif-latest-meta">
                                        <span>From {latest.senderName}</span>
                                        <span>{new Date(latest.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>

                                {rest.length > 0 && (
                                    <>
                                        <button
                                            className="notif-toggle-btn"
                                            onClick={() => setShowAllNotifs(v => !v)}
                                        >
                                            {showAllNotifs ? '▲ Hide older notifications' : `▼ Show ${rest.length} older notification${rest.length !== 1 ? 's' : ''}`}
                                        </button>
                                        {showAllNotifs && (
                                            <div className="notif-older-list">
                                                {rest.map((note) => (
                                                    <div key={note.id} className="notif-older-card">
                                                        <div className="notif-older-row">
                                                            <strong>{note.title}</strong>
                                                            <span className="notif-older-time">{new Date(note.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="notif-older-body">{note.message}</p>
                                                        <div className="notif-older-meta">From {note.senderName}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    <div className="stations-list">
                        {stationsError && (
                            <div className="message error-message">
                                Couldn't load stations — check your connection.
                                <button className="button secondary sm" onClick={loadStations} style={{ marginLeft: '0.75rem' }}>Retry</button>
                            </div>
                        )}
                        {!stationsError && stations.length === 0 && (
                            PermissionManager.canViewAdmin() ? (
                                <p className="no-stations-message">No stations have been set up yet. Add your first station to get started.</p>
                            ) : (
                                <p className="no-stations-message">No stations have been set up yet. Check back once your director adds some.</p>
                            )
                        )}
                        {stations.map(station => {
                            const status = getStationStatus(station.id);
                            const unlocked = isStationUnlocked(station.id);
                            return (
                                <div
                                    key={station.id}
                                    className={`station-row ${unlocked ? '' : 'locked'}`}
                                    onClick={() => unlocked && nav(`/station/${station.id}`)}
                                >
                                    <div className="status-indicator">{getStatusIndicator(status)}</div>
                                    <div className="station-info">
                                        <div className="station-name">{station.name}</div>
                                        <div className="station-status">
                                            {unlocked ? getStatusLabel(status) : 'Locked until previous station is proficient'}
                                        </div>
                                    </div>
                                    <div className="edit-icon">
                                        {!unlocked ? '🔒' : UserManager.isDirector ? '✏️' : '▶️'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {PermissionManager.canViewAdmin() && (
                        <button className="new-station-btn" onClick={() => nav('/admin/stations')}>+ Manage Stations</button>
                    )}
                    <p>Press the button to Logout!</p>
                    <button onClick={() => {
                        nav('/logout');
                    }}>Logout</button>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .home-notif-section { margin-bottom: 1.25rem; }
                .notif-latest-card {
                    background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
                    border: 1.5px solid #93c5fd;
                    border-radius: 12px;
                    padding: 1rem 1.1rem;
                }
                .notif-latest-badge {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #1d4ed8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.35rem;
                }
                .notif-latest-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 0.3rem; }
                .notif-latest-body { font-size: 0.9rem; color: #374151; margin-bottom: 0.5rem; white-space: pre-line; }
                .notif-latest-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: #9ca3af; }
                .notif-toggle-btn {
                    width: 100%;
                    margin-top: 0.6rem;
                    padding: 0.45rem;
                    background: none;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    color: #6b7280;
                }
                .notif-toggle-btn:hover { background: #f9fafb; }
                .notif-older-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
                .notif-older-card { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 8px; background: white; }
                .notif-older-row { display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
                .notif-older-time { font-size: 0.75rem; color: #9ca3af; white-space: nowrap; }
                .notif-older-body { font-size: 0.85rem; margin: 0 0 0.2rem; white-space: pre-line; }
                .notif-older-meta { font-size: 0.75rem; color: #9ca3af; }
            `}</style>
        </>
    );
}