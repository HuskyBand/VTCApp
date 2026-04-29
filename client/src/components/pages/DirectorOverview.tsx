import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';
import { hasPassedStation, type EvaluationRecord } from '@client/utils/evaluationHelpers';
import { type User } from '@api/user/User';

type StationSummary = {
    stationId: number;
    name: string;
    mastery: number;
    proficient: number;
    developing: number;
    notStarted: number;
    totalUsers: number;
};

type OverviewData = {
    stations: StationSummary[];
    totalUsers: number;
    totalNotifications: number;
};

type NotificationItem = {
    id: number;
    title: string;
    message: string;
    senderName: string;
    createdAt: string;
};

type UserProgress = {
    userId: number;
    firstName: string;
    lastName: string;
    instrument: string;
    highestUnlockedStation: number;
    evaluations: EvaluationRecord[];
};

export default function DirectorOverview() {
    const nav = useNavigate();
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!UserManager.isLoggedIn || !PermissionManager.canViewAdmin()) {
            nav('/');
            return;
        }

        loadOverview();
        loadNotifications();
        loadUserProgress();
    }, []);

    const loadOverview = async () => {
        try {
            const data = await UserManager.getOverview();
            setOverview(data);
        } catch (err) {
            setError('Failed to load overview data.');
        }
    };

    const loadNotifications = async () => {
        try {
            const items = await UserManager.getNotifications();
            setNotifications(items);
        } catch (err) {
            setError('Failed to load notifications.');
        }
    };

    const loadUserProgress = async () => {
        try {
            const users = await UserManager.getAllUsers();
            const progressPromises = users.filter(user => user.id).map(async (user: User) => {
                const evaluations = await UserManager.getEvaluationsForUser(user.id!);
                let highestUnlocked = 1;
                for (let stationId = 1; stationId <= 6; stationId++) {
                    if (stationId === 1 || hasPassedStation(evaluations as EvaluationRecord[], stationId - 1)) {
                        highestUnlocked = stationId;
                    } else {
                        break;
                    }
                }
                return {
                    userId: user.id!,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    instrument: user.instrument,
                    highestUnlockedStation: highestUnlocked,
                    evaluations: evaluations as EvaluationRecord[]
                };
            });
            const progress = await Promise.all(progressPromises);
            setUserProgress(progress);
        } catch (err) {
            setError('Failed to load user progress.');
        }
    };

    const handleSendNotification = async () => {
        if (!title.trim() || !message.trim()) {
            setError('Please provide both a title and a message.');
            return;
        }

        try {
            await UserManager.createNotification(title.trim(), message.trim());
            setSuccess('Notification sent successfully.');
            setTitle('');
            setMessage('');
            setError('');
            await loadNotifications();
            await loadOverview();
            await loadUserProgress();
        } catch (err) {
            setError('Failed to send notification.');
            setSuccess('');
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Director Overview</h1>
                    <p>This dashboard shows station progress across the group and lets you broadcast messages to all users.</p>
                    {error && <div className="message error-message">{error}</div>}
                    {success && <div className="message success-message">{success}</div>}

                    {overview ? (
                        <div className="overview-summary">
                            <div className="summary-panel">
                                <h2>All Users</h2>
                                <p>{overview.totalUsers} users registered</p>
                                <p>{overview.totalNotifications} recent broadcasts</p>
                            </div>
                            <div className="stations-summary">
                                {overview.stations.map((station) => (
                                    <div key={station.stationId} className="station-summary-card">
                                        <h3>{station.name}</h3>
                                        <ul>
                                            <li>Mastery: {station.mastery}</li>
                                            <li>Proficient: {station.proficient}</li>
                                            <li>Developing: {station.developing}</li>
                                            <li>No progress: {station.notStarted}</li>
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p>Loading overview...</p>
                    )}

                    <div className="user-progress">
                        <h2>User Progress</h2>
                        {userProgress.length ? (
                            <div className="user-progress-list">
                                {userProgress.map((user) => (
                                    <div key={user.userId} className="user-progress-card">
                                        <div className="user-info">
                                            <strong>{user.firstName} {user.lastName}</strong>
                                            <span>{user.instrument}</span>
                                        </div>
                                        <div className="progress-info">
                                            <span>Highest Unlocked Station: {user.highestUnlockedStation}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Loading user progress...</p>
                        )}
                    </div>

                    <div className="notification-panel">
                        <h2>Broadcast Notification</h2>
                        <div className="form-group">
                            <label htmlFor="notification-title">Title</label>
                            <input
                                id="notification-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="notification-message">Message</label>
                            <textarea
                                id="notification-message"
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="text-input"
                            />
                        </div>
                        <button className="button primary submit-btn" onClick={handleSendNotification}>Send Notification</button>
                    </div>

                    <div className="notification-list">
                        <h2>Recent Notifications</h2>
                        {notifications.length ? (
                            notifications.map((item) => (
                                <div key={item.id} className="notification-card">
                                    <div className="notification-heading">
                                        <strong>{item.title}</strong>
                                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p>{item.message}</p>
                                    <div className="notification-footer">From {item.senderName}</div>
                                </div>
                            ))
                        ) : (
                            <p>No notifications yet.</p>
                        )}
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .user-progress {
                    margin-top: 2rem;
                }

                .user-progress h2 {
                    margin-bottom: 1rem;
                }

                .user-progress-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .user-progress-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background-color: #f9f9f9;
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                }

                .user-info strong {
                    font-size: 1.1rem;
                }

                .user-info span {
                    color: #666;
                    font-size: 0.9rem;
                }

                .progress-info {
                    text-align: right;
                }
            `}</style>
        </>
    );
}
