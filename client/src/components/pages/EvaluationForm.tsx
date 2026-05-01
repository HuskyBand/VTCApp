import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import { useState } from "react";
import UserManager from "@client/stores/UserManager";

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
    const [queueMessage, setQueueMessage] = useState<string | null>(null);

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

    const handlePullFromQueue = async () => {
        if (!stationId) return;
        
        try {
            const result = await UserManager.takeNextStationQueue(parseInt(stationId));
            if (result.success) {
                setQueueMessage(result.message || 'Student pulled from queue. Please enter their name below.');
            } else {
                setQueueMessage(result.message || 'Failed to pull from queue.');
            }
        } catch (error) {
            setQueueMessage('Failed to pull from queue.');
            console.error('Queue pull error:', error);
        }
    };

    const handleSubmit = async () => {
        if (!stationId || !studentName.trim()) {
            alert('Please enter a student name.');
            return;
        }

        const stationIdNum: number = parseInt(stationId);

        try {
            // For now, we'll just log. In a real app, you'd send this to an API
            console.log('Submitting evaluation:', { studentName, stationId, criteria });
            
            // Find the user by name (this is a simplified approach)
            // In a real implementation, you'd have a way to select or search for users
            const users = await UserManager.getAllUsers(); // Assuming this method exists
            const student = users.find(u => `${u.firstName} ${u.lastName}`.toLowerCase() === studentName.toLowerCase());
            
            if (!student || !student.id) {
                alert('Student not found. Please check the name.');
                return;
            }

            const score = criteria.reduce((acc, crit) => {
                if (crit.status === 'exemplary') return acc + 25;
                if (crit.status === 'satisfactory') return acc + 15;
                return acc + 5; // developing
            }, 0);

            const success = await UserManager.submitEvaluation(student.id, stationIdNum, score, '', criteria.map(c => c.name));
            
            if (success) {
                alert('Evaluation submitted successfully!');
                // Reset form
                setStudentName('');
                setCriteria(criteria.map(c => ({ ...c, status: 'developing' })));
                setQueueMessage(null);
            } else {
                alert('Failed to submit evaluation.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('An error occurred while submitting the evaluation.');
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate Station {stationId}</h1>
                    <div className="evaluation-form">
                        <div className="queue-actions">
                            <button className="btn" onClick={handlePullFromQueue}>Pull Next from Queue</button>
                            {queueMessage && <div className="queue-message">{queueMessage}</div>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="student-name">Student Name:</label>
                            <input
                                id="student-name"
                                type="text"
                                placeholder="Enter student name or pull from queue"
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
