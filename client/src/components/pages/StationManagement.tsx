import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';
import Markdown from 'react-markdown';

type Station = {
    id: number;
    name: string;
    criteria: string[];
    feedbackItems: string[];
    teachingMarkdown: string;
    testMarkdown: string;
};

type EditState = {
    name: string;
    criteria: string;
    feedbackItems: string;
    teachingSteps: string;
    testSteps: string;
};

export default function StationManagement() {
    const nav = useNavigate();
    const [stations, setStations] = useState<Station[]>([]);
    const [newStation, setNewStation] = useState<EditState>({ name: '', criteria: '', feedbackItems: '', teachingSteps: '', testSteps: '' });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editState, setEditState] = useState<EditState>({ name: '', criteria: '', feedbackItems: '', teachingSteps: '', testSteps: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!UserManager.isLoggedIn || !UserManager.isDirector) {
            nav('/');
            return;
        }
        loadStations();
    }, [nav]);

    const loadStations = async () => {
        try {
            const data = await UserManager.getStations();
            if (data === null) {
                setError('Failed to load stations. Check your connection and try again.');
                return;
            }
            setStations(data.map(s => ({ ...s, teachingMarkdown: s.teachInstructions ?? '', testMarkdown: s.testInstructions ?? '' })));
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
        const teachingSteps = newStation.teachingSteps;
        const testSteps = newStation.testSteps;
        try {
            const ok = await UserManager.createStation(newStation.name.trim(), criteria, feedbackItems, teachingSteps, testSteps);
            if (ok) {
                setSuccess('Station created.');
                setNewStation({ name: '', criteria: '', feedbackItems: '', teachingSteps: '', testSteps: '' });
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
            teachingSteps: station.teachingMarkdown,
            testSteps: station.testMarkdown
        });
        setError('');
        setSuccess('');
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        const criteria = parseLines(editState.criteria);
        if (criteria.length === 0) { setError('At least one criterion is required.'); return; }
        const feedbackItems = parseLines(editState.feedbackItems);
        const teachingMarkdown = editState.teachingSteps;
        const testMarkdown = editState.testSteps;
        try {
            const ok = await UserManager.updateStation(editingId, editState.name.trim(), criteria, feedbackItems, teachingMarkdown, testMarkdown);
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
                    <h1>Station Edit</h1>
                    <p className="sm-subtitle">Manage stations, evaluation criteria, and common feedback items.</p>

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
                                        {/*
                                          * TODO: Make this an actual "list" element instead of doing a one per line thing. 
                                          *       It's unintuitive for anyone that doesn't write code. -J
                                          */}
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
                                                placeholder="Options available for evaluators to quickly select"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Teaching Instructions <span className="label-hint">(markdown)</span></label>
                                            <textarea
                                                className="text-input"
                                                value={editState.teachingSteps}
                                                onChange={(e) => setEditState({ ...editState, teachingSteps: e.target.value })}
                                                rows={5}
                                                placeholder="Detailed teaching instructions for Instructors and Evaluators only"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Evaluation Instructions <span className="label-hint">(markdown)</span></label>
                                            <textarea
                                                className="text-input"
                                                value={editState.testSteps}
                                                onChange={(e) => setEditState({ ...editState, testSteps: e.target.value })}
                                                rows={5}
                                                placeholder="Detailed evaluation instructions for Evaluators only"
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
                                                <button className="button secondary icon sm" onClick={() => startEdit(station)}>
                                                    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#000000">
                                                        <path d="M14.3632 5.65156L15.8431 4.17157C16.6242 3.39052 17.8905 3.39052 18.6716 4.17157L20.0858 5.58579C20.8668 6.36683 20.8668 7.63316 20.0858 8.41421L18.6058 9.8942M14.3632 5.65156L4.74749 15.2672C4.41542 15.5993 4.21079 16.0376 4.16947 16.5054L3.92738 19.2459C3.87261 19.8659 4.39148 20.3848 5.0115 20.33L7.75191 20.0879C8.21972 20.0466 8.65806 19.8419 8.99013 19.5099L18.6058 9.8942M14.3632 5.65156L18.6058 9.8942" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                    </svg>
                                                </button>
                                                <button className="button danger icon sm" onClick={() => handleDelete(station.id)}>
                                                    <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#ffffff">
                                                        <path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                        <path d="M21 6L15.375 6M3 6L8.625 6M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6L15.375 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                                    </svg>
                                                </button>
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
                                            <div className="station-view-col">
                                                <strong>Teaching Instructions</strong>
                                                {station.teachingMarkdown.length > 0
                                                    ? <div className="markdown-text-entry"><Markdown>{station.teachingMarkdown}</Markdown></div>
                                                    : <p className="empty-hint">None set</p>}
                                            </div>
                                            <div className="station-view-col">
                                                <strong>Evaluation Instructions</strong>
                                                {station.testMarkdown.length > 0
                                                    ? <div className="markdown-text-entry"><Markdown>{station.testMarkdown}</Markdown></div>
                                                    : <p className="empty-hint">None set</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {error && <div className="message error-message">{error}</div>}
                    {success && <div className="message success-message">{success}</div>}

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
                        <div className="form-group">
                            <label>Teaching Instructions <span className="label-hint">(markdown)</span></label>
                            <textarea
                                className="text-input"
                                value={newStation.teachingSteps}
                                onChange={(e) => setNewStation({ ...newStation, teachingSteps: e.target.value })}
                                rows={5}
                                placeholder="Detailed teaching instructions for Instructors and Evaluators only"
                            />
                        </div>
                        <div className="form-group">
                            <label>Evaluation Instructions <span className="label-hint">(markdown)</span></label>
                            <textarea
                                className="text-input"
                                value={newStation.testSteps}
                                onChange={(e) => setNewStation({ ...newStation, testSteps: e.target.value })}
                                rows={5}
                                placeholder="Detailed evaluation instructions for Evaluators only"
                            />
                        </div>
                        <button className="button primary" onClick={handleCreate}>Create Station</button>
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .sm-subtitle { margin-bottom: 3rem; }
                .station-card { border: 1px solid #ddd; border-radius: 10px; padding: 1.25rem; max-width: 800px; margin: 0 auto; margin-bottom: 1rem; background: #fafafa; }
                .station-view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
                .station-view-header h3 { margin: 0; }
                .station-view-sections { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
                .station-view-col { flex-basis: 300px; margin: 0 auto; }
                .station-view-col ul { margin: 0.25rem 0 0; padding-left: 1.25rem; }
                .station-view-col li { font-size: 0.9rem; text-align: left; }
                .empty-hint { color: #aaa; font-size: 0.85rem; margin: 0; }
                .label-hint { color: #888; font-size: 0.8rem; font-weight: normal; }
                .button-group { display: flex; gap: 1rem; align-content: center; }
                .button.sm { padding: 0.5rem 0.5rem; font-size: 0.85rem; min-width: 24px; }
                .button.danger { background: #ef4444; color: white; border: none; border-radius: var(--border-radius); cursor: pointer; }
                .create-station { max-width: 800px; margin: 0 auto; margin-top: 2rem; padding: 1.5rem; border: 2px dashed #d1d5db; border-radius: var(--border-radius); }
                .create-station h2 { margin-bottom: 1rem; }
                .edit-form .form-group { margin-bottom: 1rem; }
                .message { max-width: 500px; margin-left: auto; margin-right: auto; }
            `}</style>
        </>
    );
}
