import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';

type StationInfo = {
    id: number;
    name: string;
    criteria: string[];
    feedbackItems: string[];
    role?: string;
    instructorNotes?: string[];
};

export default function StationFeedbackView() {
    const nav = useNavigate();
    const [stations, setStations] = useState<StationInfo[]>([]);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        const check = async () => {
            if (!UserManager.isLoggedIn) { nav('/'); return; }
            if (UserManager.isDirector || UserManager.isElevated) {
                loadStations();
                return;
            }
            const stations = await UserManager.getStations();
            const hasRoleSomewhere = (stations ?? []).some((s) => s.role === 'evaluator' || s.role === 'instructor');
            if (!hasRoleSomewhere) { nav('/'); return; }
            loadStations();
        };
        check();
    }, []);

    const loadStations = () => {
        UserManager.getStations()
            .then((s) => setStations(s ?? []))
            .catch(() => setError('Failed to load station information.'));
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Station Reference</h1>
                    <p>Evaluation criteria and common feedback areas for each station — for teaching reference.</p>
                    {error && <div className="message error-message">{error}</div>}
                    {stations.length === 0 && !error && <p>No stations configured yet.</p>}
                    <div className="sfv-list">
                        {stations.map((station) => (
                            <div key={station.id} className="sfv-card">
                                <button
                                    className="sfv-toggle"
                                    onClick={() => setExpandedId(expandedId === station.id ? null : station.id)}
                                >
                                    <span className="sfv-name">{station.name}</span>
                                    <span className="sfv-chevron">{expandedId === station.id ? '▲' : '▼'}</span>
                                </button>
                                {expandedId === station.id && (
                                    <div className="sfv-body">
                                        <div className="sfv-col">
                                            <h4>Evaluation Criteria</h4>
                                            {station.criteria.length > 0
                                                ? <ul>{station.criteria.map((c, i) => <li key={i}>{c}</li>)}</ul>
                                                : <p className="sfv-empty">No criteria defined.</p>}
                                        </div>
                                        <div className="sfv-col">
                                            <h4>Common Feedback Areas</h4>
                                            {station.feedbackItems.length > 0
                                                ? <ul>{station.feedbackItems.map((f, i) => <li key={i}>{f}</li>)}</ul>
                                                : <p className="sfv-empty">No feedback items defined.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <BottomNav />
            <style>{`
                .sfv-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
                .sfv-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
                .sfv-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.1rem; background: #f9fafb; border: none; cursor: pointer; font-size: 1rem; }
                .sfv-toggle:hover { background: #f3f4f6; }
                .sfv-name { font-weight: 700; }
                .sfv-chevron { color: #9ca3af; }
                .sfv-body { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; padding: 1rem 1.1rem 1.25rem; background: white; }
                .sfv-col h4 { margin: 0 0 0.5rem; font-size: 0.9rem; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
                .sfv-col ul { margin: 0; padding-left: 1.25rem; }
                .sfv-col li { font-size: 0.9rem; margin-bottom: 0.2rem; }
                .sfv-empty { color: #aaa; font-size: 0.85rem; margin: 0; }
                @media (max-width: 480px) { .sfv-body { grid-template-columns: 1fr; } }
            `}</style>
        </>
    );
}
