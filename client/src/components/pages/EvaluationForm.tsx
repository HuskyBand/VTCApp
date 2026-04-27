import { useParams } from "react-router";
import BottomNav from "../BottomNav";
import { useState, useEffect } from "react";
import UserManager from "@client/stores/UserManager";
import type { User } from "@api/user/User";

type Criterion = {
    name: string;
    status: 'developing' | 'satisfactory' | 'exemplary';
};

export default function EvaluationForm() {
    const { stationId } = useParams();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([
        { name: 'Criteria 1', status: 'developing' },
        { name: 'Criteria 2', status: 'developing' },
        { name: 'Criteria 3', status: 'developing' },
        { name: 'Criteria 4', status: 'developing' },
    ]);
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            console.log('Loading users...');
            const users = await UserManager.getAllUsers();
            console.log('Users loaded:', users);
            if (!users || users.length === 0) {
                console.warn('No users returned from API');
                setMessage('No students found in the system.');
            } else {
                setAllUsers(users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            setMessage(`Failed to load user list: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = parseInt(e.target.value);
        const user = allUsers.find(u => u.id === userId) || null;
        setSelectedUser(user);
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

    const calculateScore = () => {
        const statusValues = { developing: 1, satisfactory: 2, exemplary: 3 };
        const total = criteria.reduce((sum, crit) => sum + statusValues[crit.status], 0);
        return Math.round((total / criteria.length) * 100 / 3); // Convert to percentage
    };

    const handleSubmit = async () => {
        if (!selectedUser) {
            setMessage('Please select a valid user first.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const score = calculateScore();
            const success = await UserManager.submitEvaluation(
                selectedUser.id!,
                parseInt(stationId!),
                score,
                comments
            );

            if (success) {
                setMessage('Evaluation submitted successfully!');
                // Reset form
                setSelectedUser(null);
                setComments('');
                setCriteria(criteria.map(c => ({ ...c, status: 'developing' })));
            } else {
                setMessage('Failed to submit evaluation. Please try again.');
            }
        } catch (error) {
            console.error('Evaluation submission error:', error);
            setMessage('An error occurred while submitting the evaluation. Please try again.');
        }

        setIsSubmitting(false);
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate Station {stationId}</h1>
                    <div className="evaluation-form">
                        <div className="form-group">
                            <label htmlFor="user-select">Select Student to Evaluate:</label>
                            <select
                                id="user-select"
                                value={selectedUser?.id || ''}
                                onChange={handleUserSelect}
                                className="text-input"
                            >
                                <option value="">-- Select a student --</option>
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.username}) - {user.instrument}
                                    </option>
                                ))}
                            </select>
                            {selectedUser && (
                                <div className="selected-user valid">
                                    <strong>✓ Selected:</strong> {selectedUser.firstName} {selectedUser.lastName} - {selectedUser.instrument}
                                </div>
                            )}
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

                        <div className="form-group">
                            <label htmlFor="comments">Comments (Optional):</label>
                            <textarea
                                id="comments"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="text-input"
                                rows={3}
                                placeholder="Additional comments about the evaluation..."
                            />
                        </div>

                        {message && (
                            <div className={`message ${message.includes('success') ? 'success-message' : 'error-message'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            className="button primary submit-btn"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedUser}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                        </button>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}
