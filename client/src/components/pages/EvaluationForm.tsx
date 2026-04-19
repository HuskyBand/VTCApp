import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import { useState } from "react";

type Criterion = {
    name: string;
    status: 'developing' | 'satisfactory' | 'exemplary';
};

export default function EvaluationForm() {
    const { stationId } = useParams();
    const [studentName, setStudentName] = useState('');
    const [criteria, setCriteria] = useState<Criterion[]>([
        { name: 'Criteria 1', status: 'developing' },
        { name: 'Criteria 2', status: 'developing' },
        { name: 'Criteria 3', status: 'developing' },
        { name: 'Criteria 4', status: 'developing' },
    ]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStudentName(e.target.value);
    };

    const handleStatusChange = (index: number, newStatus: 'developing' | 'satisfactory' | 'exemplary') => {
        const newCriteria = [...criteria];
        newCriteria[index].status = newStatus;
        setCriteria(newCriteria);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'developing': return 'purple';
            case 'satisfactory': return 'grey';
            case 'exemplary': return 'gold';
            default: return 'grey';
        }
    };

    const handleSubmit = () => {
        console.log('Submitting evaluation:', { studentName, stationId, criteria });
        // TODO: Send to API
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate</h1>
                    <div className="evaluation-form">
                        <div className="form-group">
                            <label htmlFor="student-name">Student Name:</label>
                            <input
                                id="student-name"
                                type="text"
                                placeholder="Enter student name"
                                value={studentName}
                                onChange={handleNameChange}
                                className="text-input"
                            />
                        </div>

                        <div className="main-points">
                            <h3>Station {stationId} - Main Points</h3>
                            <ul>
                                <li>Point 1 to look for</li>
                                <li>Point 2 to look for</li>
                            </ul>
                        </div>

                        <div className="criteria-form-list">
                            {criteria.map((criterion, idx) => (
                                <div key={idx} className="criteria-form-row">
                                    <div className="criteria-form-info">
                                        <div className="criteria-name">{criterion.name}</div>
                                    </div>
                                    <div className="criteria-status-selector">
                                        {(['developing', 'satisfactory', 'exemplary'] as const).map(status => (
                                            <button
                                                key={status}
                                                className={`status-option ${getStatusColor(status)} ${criterion.status === status ? 'active' : ''}`}
                                                onClick={() => handleStatusChange(idx, status)}
                                            >
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="btn submit-btn" onClick={handleSubmit}>
                            Submit Evaluation
                        </button>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}
