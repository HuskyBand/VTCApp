import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';

type Station = {
    id: number;
    name: string;
    criteria: string[];
    feedbackItems: string[];
};

type EditState = {
    name: string;
    criteria: string;
    feedbackItems: string;
};

export default function StationManagement() {
    const nav = useNavigate();
    const [stations, setStations] = useState<Station[]>([]);
    const [newStation, setNewStation] = useState<EditState>({ name: '', criteria: '', feedbackItems: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editState, setEditState] = useState<EditState>({ name: '', criteria: '', feedbackItems: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!UserManager.isLoggedIn || !PermissionManager.canViewAdmin()) {
            nav('/');
            return;
        }
        loadStations();
    }, []);

    const loadStations = async () => {
        try {
            const data = await UserManager.getStations();
            if (data === null) {
                setError('Failed to load stations. Check your connection and try again.');
                return;
            }
            setStations(data);
        } catch {
            setError('Failed to load stations.');
        }
    };

    const parseLines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean);

    const handleCreate = async () => {
        if (!newStation.name.trim()) { setError('Station name is required.'); return; }
        const criteria = parseLines(newStation.criteria);
        if (criteria.length === 0) { setError('At least one criterion is required.'); return; }
        const feedbackItems = parseLines(newStation.feedbackItems);
        try {
            const ok = await UserManager.createStation(newStation.name.trim(), criteria, feedbackItems);
            if (ok) {
                setSuccess('Station created.');
                setNewStation({ name: '', criteria: '', feedbackItems: '' });
                setError('');
                await loadStations();
            } else {
                setError('Failed to create station.');
            }
        } catch {
            setError('Failed to create station.');
        }
    };

    const startEdit = (station: Station) => {
        setEditingId(station.id);
        setEditState({
            name: station.name,
            criteria: station.criteria.join('\n'),
            feedbackItems: station.feedbackItems.join('\n'),
        });
        setError('');
        setSuccess('');
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        const criteria = parseLines(editState.criteria);
        if (criteria.length === 0) { setError('At least one criterion is required.'); return; }
        const feedbackItems = parseLines(editState.feedbackItems);
        try {
            const ok = await UserManager.updateStation(editingId, editState.name.trim(), criteria, feedbackItems);
            if (ok) {
                setSuccess('Station updated.');
                setEditingId(null);
                setError('');
                await loadStations();
            } else {
                setError('Failed to update station.');
            }
        } catch {
            setError('Failed to update station.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this station? This cannot be undone.')) return;
        try {
            const ok = await UserManager.deleteStation(id);
            if (ok) { setSuccess('Station deleted.'); setError(''); await loadStations(); }
            else setError('Failed to delete station.');
        } catch {
            setError('Failed to delete station.');
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Station Management</h1>
                    <p>Manage stations, evaluation criteria, and common feedback items.</p>
                    {error && <div className="message error-message">{error}</div>}
                    {success && <div className="message success-message">{success}</div>}

                    <div className="station-list">
                        {stations.length === 0 && <p>No stations yet.</p>}
                        {stations.map((station) => (
                            <div key={station.id} className="station-card">
                                {editingId === station.id ? (
                                    <div className="edit-form">
                                        <div className="form-group">
                                            <label>Station Name</label>
                                            <input
                                                className="text-input"
                                                value={editState.name}
                                                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                                                placeholder="Station name"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Evaluation Criteria <span className="label-hint">(one per line)</span></label>
                                            <textarea
                                                className="text-input"
                                                value={editState.criteria}
                                                onChange={(e) => setEditState({ ...editState, criteria: e.target.value })}
                                                rows={5}
                                                placeholder="Each line is one criterion"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Areas to Work On <span className="label-hint">(one per line)</span></label>
                                            <textarea
                                                className="text-input"
                                                value={editState.feedbackItems}
                                                onChange={(e) => setEditState({ ...editState, feedbackItems: e.target.value })}
                                                rows={5}
                                                placeholder="e.g. Tone quality, Rhythm accuracy…"
                                            />
                                        </div>
                                        <div className="button-group">
                                            <button className="button primary" onClick={handleSaveEdit}>Save Changes</button>
                                            <button className="button secondary" onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="station-view">
                                        <div className="station-view-header">
                                            <h3>{station.name}</h3>
                                            <div className="button-group">
                                                <button className="button secondary sm" onClick={() => startEdit(station)}>Edit</button>
                                                <button className="button danger sm" onClick={() => handleDelete(station.id)}>Delete</button>
                                            </div>
                                        </div>
                                        <div className="station-view-sections">
                                            <div className="station-view-col">
                                                <strong>Criteria</strong>
                                                {station.criteria.length > 0
                                                    ? <ul>{station.criteria.map((c, i) => <li key={i}>{c}</li>)}</ul>
                                                    : <p className="empty-hint">None set</p>}
                                            </div>
                                            <div className="station-view-col">
                                                <strong>Areas to Work On</strong>
                                                {station.feedbackItems.length > 0
                                                    ? <ul>{station.feedbackItems.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                                    : <p className="empty-hint">None set</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="create-station">
                        <h2>Create New Station</h2>
                        <div className="form-group">
                            <label>Station Name</label>
                            <input
                                className="text-input"
                                value={newStation.name}
                                onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                                placeholder="e.g. Station 7"
                            />
                        </div>
                        <div className="form-group">
                            <label>Evaluation Criteria <span className="label-hint">(one per line)</span></label>
                            <textarea
                                className="text-input"
                                value={newStation.criteria}
                                onChange={(e) => setNewStation({ ...newStation, criteria: e.target.value })}
                                rows={5}
                                placeholder="Each line becomes one criterion"
                            />
                        </div>
                        <div className="form-group">
                            <label>Areas to Work On <span className="label-hint">(one per line)</span></label>
                            <textarea
                                className="text-input"
                                value={newStation.feedbackItems}
                                onChange={(e) => setNewStation({ ...newStation, feedbackItems: e.target.value })}
                                rows={5}
                                placeholder="e.g. Tone quality, Rhythm accuracy…"
                            />
                        </div>
                        <button className="button primary" onClick={handleCreate}>Create Station</button>
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .station-card { border: 1px solid #ddd; border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem; background: #fafafa; }
                .station-view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
                .station-view-header h3 { margin: 0; }
                .station-view-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .station-view-col ul { margin: 0.25rem 0 0; padding-left: 1.25rem; }
                .station-view-col li { font-size: 0.9rem; }
                .empty-hint { color: #aaa; font-size: 0.85rem; margin: 0; }
                .label-hint { color: #888; font-size: 0.8rem; font-weight: normal; }
                .button-group { display: flex; gap: 0.5rem; }
                .button.sm { padding: 0.25rem 0.75rem; font-size: 0.85rem; }
                .button.danger { background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; }
                .create-station { margin-top: 2rem; padding: 1.5rem; border: 2px dashed #d1d5db; border-radius: 12px; }
                .create-station h2 { margin-bottom: 1rem; }
                .edit-form .form-group { margin-bottom: 1rem; }
            `}</style>
        </>
    );
}
