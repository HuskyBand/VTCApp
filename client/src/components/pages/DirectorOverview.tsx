import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';

type StationSummary = {
    stationId: number;
    name: string;
    mastery: number;
    proficient: number;
    developing: number;
    notStarted: number;
    totalUsers: number;
};

type UnlockSummary = {
    stationId: number;
    label: string;
    count: number;
};

type StationCapability = {
    stationId: number;
    name: string;
    canEvaluate: number;
    canTeach: number;
};

type OverviewData = {
    stations: StationSummary[];
    totalUsers: number;
    totalNotifications: number;
    highestUnlockedCounts: UnlockSummary[];
    capabilityByStation: StationCapability[];
};

type NotificationItem = {
    id: number;
    title: string;
    message: string;
    senderName: string;
    createdAt: string;
};

export default function DirectorOverview() {
    const nav = useNavigate();
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loadingOverview, setLoadingOverview] = useState(true);

    useEffect(() => {
        if (!UserManager.isLoggedIn || !PermissionManager.canViewAdmin()) {
            nav('/');
            return;
        }

        loadOverview();
        loadNotifications();
    }, []);

    const loadOverview = async () => {
        setLoadingOverview(true);
        setError('');
        try {
            const data = await UserManager.getOverview();
            if (!data) {
                setError('Failed to load overview data.');
                return;
            }
            setOverview(data);
        } catch (err) {
            setError('Failed to load overview data.');
        } finally {
            setLoadingOverview(false);
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
                        <>
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

                            <div className="unlock-summary">
                                <h2>Highest Station Unlocked</h2>
                                <div className="unlock-grid">
                                    {overview.highestUnlockedCounts.map((item) => (
                                        <div key={item.stationId} className="unlock-card">
                                            <strong>{item.label}</strong>
                                            <span>{item.count} people</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="capability-summary">
                                <h2>Station Teaching / Evaluation Capacity</h2>
                                <div className="capability-grid">
                                    {overview.capabilityByStation.map((station) => (
                                        <div key={station.stationId} className="capability-card">
                                            <h3>{station.name}</h3>
                                            <ul>
                                                <li>Can evaluate: {station.canEvaluate}</li>
                                                <li>Can teach: {station.canTeach}</li>
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : loadingOverview ? (
                        <p>Loading overview...</p>
                    ) : (
                        <p>Unable to load overview. Please refresh.</p>
                    )}

                    <div className="admin-actions">
                        <button className="button secondary" onClick={() => nav('/admin/stations')}>Manage Stations</button>
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

                .unlock-summary,
                .capability-summary {
                    margin-top: 2rem;
                }

                .unlock-grid,
                .capability-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1rem;
                }

                .unlock-card,
                .capability-card,
                .station-summary-card {
                    padding: 1rem;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background-color: #f9f9f9;
                }

                .unlock-card strong,
                .capability-card h3 {
                    display: block;
                    margin-bottom: 0.5rem;
                }

                .capability-card ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .capability-card li {
                    margin-bottom: 0.35rem;
                }
            `}</style>
        </>
    );
}
