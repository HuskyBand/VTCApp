import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';
import { scoreToStatus, getLatestStationEvaluation, type EvaluationRecord } from '@client/utils/evaluationHelpers';
import { type User } from '@api/user/User';

type StationSummary = {
    stationId: number; name: string;
    mastery: number; proficient: number; developing: number; notStarted: number;
    evaluatorCount: number; totalUsers: number;
};
type ActivityItem = { id: number; evaluatorName: string; evaluatedName: string; stationName: string; score?: number; createdAt: string };
type OverviewData = { stations: StationSummary[]; activity: ActivityItem[]; totalUsers: number; totalNotifications: number };
type NotificationItem = { id: number; title: string; message: string; senderName: string; createdAt: string };
type LiveNotif = { title: string; message: string; senderName: string; ts: number };

const STATUS_COLORS: Record<string, string> = {
    mastery: '#22c55e', proficient: '#60a5fa', developing: '#f97316', not_started: '#d1d5db'
};

export default function DirectorOverview() {
    const nav = useNavigate();
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [users, setUsers] = useState<(User & { id: number })[]>([]);
    const [userProgressMap, setUserProgressMap] = useState<Map<number, EvaluationRecord[]>>(new Map());
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [liveNotifs, setLiveNotifs] = useState<LiveNotif[]>([]);
    const sseRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!UserManager.isLoggedIn || !PermissionManager.canViewAdmin()) { nav('/'); return; }
        loadAll();
        startSSE();
        return () => sseRef.current?.close();
    }, []);

    const startSSE = () => {
        // Build SSE URL with auth token via query param isn't ideal; use a ping-based approach via the existing token
        // We use fetch-based EventSource workaround since browser EventSource doesn't support custom headers
        // Instead we poll notifications every 10s as a reliable fallback alongside SSE where supported
        const interval = setInterval(async () => {
            const items = await UserManager.getNotifications().catch(() => []);
            setNotifications(items);
        }, 10000);
        return () => clearInterval(interval);
    };

    const loadAll = async () => {
        try {
            const [overviewData, notifData, allUsers] = await Promise.all([
                UserManager.getOverview(),
                UserManager.getNotifications(),
                UserManager.getAllUsers(),
            ]);
            setOverview(overviewData);
            setNotifications(notifData ?? []);
            setUsers((allUsers ?? []).filter((u): u is User & { id: number } => u.id !== undefined));

            // Load evaluations for all users in parallel
            const entries = await Promise.all(
                (allUsers ?? []).filter((u): u is User & { id: number } => u.id !== undefined).map(async (u: User & { id: number }) => {
                    const evals = await UserManager.getEvaluationsForUser(u.id).catch(() => []);
                    return [u.id, evals] as [number, EvaluationRecord[]];
                })
            );
            setUserProgressMap(new Map(entries));
        } catch {
            setError('Failed to load overview data.');
        }
    };

    const handleBroadcast = async () => {
        if (!title.trim() || !broadcastMsg.trim()) { setError('Title and message are required.'); return; }
        try {
            await UserManager.createNotification(title.trim(), broadcastMsg.trim());
            setSuccess('Broadcast sent to all members.');
            setTitle(''); setBroadcastMsg(''); setError('');
            const items = await UserManager.getNotifications();
            setNotifications(items);
            setLiveNotifs(prev => [{ title: title.trim(), message: broadcastMsg.trim(), senderName: 'You', ts: Date.now() }, ...prev]);
            if (overview) setOverview({ ...overview, totalNotifications: overview.totalNotifications + 1 });
        } catch {
            setError('Failed to send broadcast.'); setSuccess('');
        }
    };

    const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
    const selectedEvals = selectedUserId ? (userProgressMap.get(selectedUserId) ?? []) : [];

    return (
        <>
            <section id="center">
                <div className="director-page">
                    <div className="director-header">
                        <h1>Director Overview</h1>
                        <Link to="/admin/stations" className="button primary sm">⚙️ Manage Stations</Link>
                    </div>

                    {error && <div className="message error-message">{error}</div>}
                    {success && <div className="message success-message">{success}</div>}

                    {/* Live notification banner */}
                    {liveNotifs.length > 0 && (
                        <div className="live-banner">
                            {liveNotifs.slice(0, 1).map((n, i) => (
                                <div key={i} className="live-notif">
                                    <strong>📣 Broadcast sent:</strong> {n.title} — {n.message}
                                    <button className="live-close" onClick={() => setLiveNotifs(prev => prev.slice(1))}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary bar */}
                    {overview && (
                        <div className="summary-bar">
                            <div className="summary-chip">{overview.totalUsers} members</div>
                            <div className="summary-chip">{overview.totalNotifications} broadcasts</div>
                            <div className="summary-chip">{users.length} registered</div>
                        </div>
                    )}

                    {/* Station cards */}
                    <h2 className="section-heading">Station Progress</h2>
                    {overview ? (
                        <div className="station-grid">
                            {overview.stations.map((s) => {
                                const total = s.totalUsers || 1;
                                const pcts = {
                                    mastery: (s.mastery / total) * 100,
                                    proficient: (s.proficient / total) * 100,
                                    developing: (s.developing / total) * 100,
                                    not_started: (s.notStarted / total) * 100,
                                };
                                return (
                                    <div key={s.stationId} className="station-stat-card">
                                        <div className="station-stat-header">
                                            <span className="station-stat-name">{s.name}</span>
                                            <span className="evaluator-badge">👥 {s.evaluatorCount} evaluator{s.evaluatorCount !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="progress-bar-stack">
                                            {(['mastery', 'proficient', 'developing', 'not_started'] as const).map(key => (
                                                pcts[key] > 0 && (
                                                    <div key={key} className="progress-seg" style={{ width: `${pcts[key]}%`, background: STATUS_COLORS[key] }} title={key} />
                                                )
                                            ))}
                                        </div>
                                        <div className="station-stat-counts">
                                            <span className="stat-pill" style={{ background: STATUS_COLORS.mastery }}>✓ {s.mastery}</span>
                                            <span className="stat-pill" style={{ background: STATUS_COLORS.proficient }}>↗ {s.proficient}</span>
                                            <span className="stat-pill" style={{ background: STATUS_COLORS.developing }}>~ {s.developing}</span>
                                            <span className="stat-pill" style={{ background: STATUS_COLORS.not_started, color: '#666' }}>– {s.notStarted}</span>
                                        </div>
                                        <div className="station-legend">
                                            <span>✓ mastery</span><span>↗ proficient</span><span>~ developing</span><span>– not started</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p>Loading station data…</p>}

                    {/* Individual member progress */}
                    <h2 className="section-heading">Member Progress</h2>
                    <div className="member-select-row">
                        <select
                            className="text-input member-select"
                            value={selectedUserId ?? ''}
                            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">— Select a member —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.instrument})</option>
                            ))}
                        </select>
                        {selectedUserId && (
                            <button className="button secondary sm" onClick={() => setSelectedUserId(null)}>Clear</button>
                        )}
                    </div>

                    {selectedUser && (
                        <div className="member-detail-card">
                            <h3>{selectedUser.firstName} {selectedUser.lastName} <span className="member-instrument">— {selectedUser.instrument}</span></h3>
                            <div className="member-stations-grid">
                                {(overview?.stations ?? []).map(s => {
                                    const latest = getLatestStationEvaluation(selectedEvals, s.stationId);
                                    const status = scoreToStatus(latest?.score);
                                    const labels: Record<string, string> = { mastery: 'Mastery', satisfactory: 'Proficient', developing: 'Developing', not_started: 'Not Started' };
                                    return (
                                        <div key={s.stationId} className="member-station-chip" style={{ borderColor: STATUS_COLORS[status] ?? STATUS_COLORS.not_started }}>
                                            <span className="chip-label">{s.name}</span>
                                            <span className="chip-status" style={{ color: STATUS_COLORS[status] ?? STATUS_COLORS.not_started }}>
                                                {labels[status] ?? 'Not Started'}
                                            </span>
                                            {latest?.score !== undefined && (
                                                <span className="chip-score">{latest.score}%</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Activity log */}
                    <h2 className="section-heading">Activity Log</h2>
                    <div className="activity-list">
                        {(!overview || overview.activity.length === 0) && <p>No evaluation activity yet.</p>}
                        {overview?.activity.map((item) => (
                            <div key={item.id} className="activity-row">
                                <span><strong>{item.evaluatorName}</strong> evaluated <strong>{item.evaluatedName}</strong> at {item.stationName}</span>
                                <span className="activity-meta">
                                    {item.score !== undefined && item.score !== null ? `${item.score}% — ` : ''}
                                    {new Date(item.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Broadcast */}
                    <h2 className="section-heading">Broadcast to All Members</h2>
                    <div className="broadcast-panel">
                        <div className="form-group">
                            <label htmlFor="bc-title">Title</label>
                            <input id="bc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="text-input" placeholder="e.g. Practice reminder" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bc-msg">Message</label>
                            <textarea id="bc-msg" rows={3} value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} className="text-input" placeholder="Message to all members…" />
                        </div>
                        <button className="button primary" onClick={handleBroadcast}>📣 Send Broadcast</button>
                    </div>

                    {/* Notification history */}
                    <h2 className="section-heading">Recent Broadcasts</h2>
                    <div className="notif-list">
                        {notifications.length === 0 && <p>No broadcasts yet.</p>}
                        {notifications.map((n) => (
                            <div key={n.id} className="notif-card">
                                <div className="notif-row">
                                    <strong>{n.title}</strong>
                                    <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="notif-body">{n.message}</p>
                                <div className="notif-sender">— {n.senderName}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .director-page { padding-bottom: 2rem; }
                .director-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
                .director-header h1 { margin: 0; }
                .section-heading { margin: 1.75rem 0 0.75rem; font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.4rem; }
                .summary-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
                .summary-chip { background: #f3f4f6; border-radius: 20px; padding: 0.3rem 0.9rem; font-size: 0.85rem; font-weight: 600; }

                .station-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
                .station-stat-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
                .station-stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; }
                .station-stat-name { font-weight: 700; font-size: 1rem; }
                .evaluator-badge { font-size: 0.75rem; background: #eff6ff; color: #1d4ed8; padding: 0.2rem 0.5rem; border-radius: 10px; white-space: nowrap; }
                .progress-bar-stack { display: flex; height: 10px; border-radius: 6px; overflow: hidden; background: #f3f4f6; margin-bottom: 0.6rem; }
                .progress-seg { height: 100%; transition: width 0.3s; }
                .station-stat-counts { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
                .stat-pill { font-size: 0.8rem; padding: 0.15rem 0.5rem; border-radius: 10px; color: white; font-weight: 600; }
                .station-legend { display: flex; gap: 0.6rem; font-size: 0.7rem; color: #9ca3af; flex-wrap: wrap; }

                .member-select-row { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
                .member-select { flex: 1; max-width: 360px; }
                .member-detail-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
                .member-detail-card h3 { margin: 0 0 1rem; }
                .member-instrument { font-weight: 400; color: #6b7280; font-size: 0.9rem; }
                .member-stations-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
                .member-station-chip { border: 2px solid; border-radius: 8px; padding: 0.5rem 0.75rem; display: flex; flex-direction: column; align-items: center; }
                .chip-label { font-size: 0.75rem; color: #6b7280; }
                .chip-status { font-size: 0.8rem; font-weight: 700; }
                .chip-score { font-size: 0.7rem; color: #9ca3af; }

                .activity-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
                .activity-row { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0.65rem 0.9rem; display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; font-size: 0.9rem; }
                .activity-meta { font-size: 0.75rem; color: #9ca3af; white-space: nowrap; }

                .broadcast-panel { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
                .broadcast-panel .form-group { margin-bottom: 0.75rem; }

                .notif-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .notif-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0.9rem 1rem; }
                .notif-row { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; margin-bottom: 0.3rem; }
                .notif-time { font-size: 0.75rem; color: #9ca3af; white-space: nowrap; }
                .notif-body { margin: 0 0 0.3rem; font-size: 0.9rem; }
                .notif-sender { font-size: 0.8rem; color: #6b7280; }

                .live-banner { margin-bottom: 1rem; }
                .live-notif { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; }
                .live-close { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 1rem; color: #6b7280; }
                .button.sm { padding: 0.3rem 0.75rem; font-size: 0.85rem; }
            `}</style>
        </>
    );
}
