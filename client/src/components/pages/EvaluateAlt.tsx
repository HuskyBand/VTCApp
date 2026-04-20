import { useState } from "react";
import BottomNav from "../BottomNav";

export default function EvaluateAlt() {
    const [selectedStatuses, setSelectedStatuses] = useState<{[key: number]: string}>({});

    // Mock data
    const evaluation = {
        name: 'John Doe',
        mainPoints: ['Point 1', 'Point 2'],
        criteria: [
            { name: 'Criteria 1' },
            { name: 'Criteria 2' },
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