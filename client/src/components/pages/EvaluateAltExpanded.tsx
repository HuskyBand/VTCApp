import { useState } from "react";
import BottomNav from "../BottomNav";

export default function EvaluateAltExpanded() {
    const [selectedStatuses, setSelectedStatuses] = useState<{[key: number]: string}>({});
    const [expanded, setExpanded] = useState<{[key: number]: boolean}>({});

    // Mock data
    const evaluation = {
        name: 'John Doe',
        mainPoints: ['Point 1', 'Point 2'],
        criteria: [
            { name: 'Criteria 1', errors: ['Error 1', 'Error 2'] },
            { name: 'Criteria 2', errors: ['Error 3', 'Error 4'] },
        ]
    };

    const statuses = ['Developing', 'Satisfactory', 'Exemplary'];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Developing': return 'purple';
            case 'Satisfactory': return 'grey';
            case 'Exemplary': return 'gold';
            default: return '';
        }
    };

    const handleSelect = (idx: number, status: string) => {
        setSelectedStatuses({ ...selectedStatuses, [idx]: status });
        setExpanded({ ...expanded, [idx]: true });
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate (alt)</h1>
                    <div className="name-field">Name: {evaluation.name}</div>
                    <div className="main-points">
                        <h3>Station Main Points</h3>
                        <ul>
                            {evaluation.mainPoints.map((point, idx) => <li key={idx}>{point}</li>)}
                        </ul>
                    </div>
                    <div className="criteria-list">
                        {evaluation.criteria.map((crit, idx) => (
                            <div key={idx} className="criteria-section">
                                <h3>{crit.name}</h3>
                                <div className="badge-row">
                                    {statuses.map(status => (
                                        <button
                                            key={status}
                                            className={`badge ${getStatusColor(status)} ${selectedStatuses[idx] === status ? 'selected' : ''}`}
                                            onClick={() => handleSelect(idx, status)}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                                {expanded[idx] && (
                                    <div className="errors-list">
                                        {crit.errors.map((error, i) => (
                                            <div key={i} className="error-item">
                                                <input type="checkbox" id={`error-${idx}-${i}`} />
                                                <label htmlFor={`error-${idx}-${i}`}>{error}</label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <button className="btn submit-btn">Submit</button>
                </div>
            </section>
            <BottomNav />
        </>
    );
}