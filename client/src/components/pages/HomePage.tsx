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
} from '@client/utils/evaluationHelpers';

type Station = {
    id: number;
    name: string;
    status: 'completed' | 'in_progress' | 'not_started';
};

const stations: Station[] = [
    { id: 1, name: 'Station 1', status: 'not_started' },
    { id: 2, name: 'Station 2', status: 'not_started' },
    { id: 3, name: 'Station 3', status: 'not_started' },
    { id: 4, name: 'Station 4', status: 'not_started' },
    { id: 5, name: 'Station 5', status: 'not_started' },
    { id: 6, name: 'Station 6', status: 'not_started' },
    // Add more as needed
];

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

// Assumed to be logged in if this page is loaded.
export default function HomePage() {
    const nav = useNavigate();
    const [permission, setPermission] = useState(PermissionManager.permission);
    const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
    const [notifications, setNotifications] = useState<Array<{ title: string; message: string; senderName: string; createdAt: string }>>([]);

    useEffect(() => {
        loadEvaluations();
        loadNotifications();
    }, []);

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
        setNotifications(latestNotifications.slice(0, 3));
    };

    const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPermission = e.target.value as UserPermission;
        PermissionManager.permission = newPermission;
        setPermission(newPermission);
    };

    const getStationStatus = (stationId: number): 'completed' | 'in_progress' | 'not_started' => {
        const latest = getLatestStationEvaluation(evaluations, stationId);
        const status = scoreToStatus(latest?.score);
        if (status === 'mastery') return 'completed';
        if (status === 'satisfactory') return 'in_progress';
        return 'not_started';
    };

    const isStationUnlocked = (stationId: number): boolean => {
        if (stationId <= 1) {
            return true;
        }
        return hasPassedStation(evaluations, stationId - 1);
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

                    {notifications.length > 0 && (
                        <div className="home-notifications">
                            <h3>Notifications</h3>
                            {notifications.map((note, index) => (
                                <div key={index} className="notification-card">
                                    <div className="notification-header">
                                        <strong>{note.title}</strong>
                                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p>{note.message}</p>
                                    <div className="notification-footer">From {note.senderName}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="stations-list">
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
                                    <div className="edit-icon">{unlocked ? '✏️' : '🔒'}</div>
                                </div>
                            );
                        })}
                    </div>
                    {PermissionManager.canViewAdmin() && (
                        <button className="new-station-btn" onClick={() => nav('/admin/stations')}>+ Manage Stations</button>
                    )}
                    <p>Press the button to do a fake logout!</p>
                    <button onClick={() => {
                        nav('/logout');
                    }}>Logout</button>
                </div>
            </section>
            <BottomNav />
        </>
    );
}