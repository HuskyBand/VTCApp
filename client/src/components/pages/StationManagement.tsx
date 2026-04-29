import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import BottomNav from '../BottomNav';
import UserManager from '@client/stores/UserManager';
import PermissionManager from '@client/stores/PermissionManager';

type Station = {
    id: number;
    name: string;
    criteria: string[];
};

export default function StationManagement() {
    const nav = useNavigate();
    const [stations, setStations] = useState<Station[]>([]);
    const [newStationName, setNewStationName] = useState('');
    const [newStationCriteria, setNewStationCriteria] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editCriteria, setEditCriteria] = useState('');
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
            setStations(data);
        } catch (err) {
            setError('Failed to load stations.');
        }
    };

    const handleCreate = async () => {
        if (!newStationName.trim()) {
            setError('Station name is required.');
            return;
        }

        const criteria = newStationCriteria.split('\n').filter(line => line.trim());
        if (criteria.length === 0) {
            setError('At least one criterion is required.');
            return;
        }

        try {
            const success = await UserManager.createStation(newStationName.trim(), criteria);
            if (success) {
                setSuccess('Station created successfully.');
                setNewStationName('');
                setNewStationCriteria('');
                setError('');
                await loadStations();
            } else {
                setError('Failed to create station.');
            }
        } catch (err) {
            setError('Failed to create station.');
        }
    };

    const handleEdit = (station: Station) => {
        setEditingId(station.id);
        setEditName(station.name);
        setEditCriteria(station.criteria.join('\n'));
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;

        const criteria = editCriteria.split('\n').filter(line => line.trim());
        if (criteria.length === 0) {
            setError('At least one criterion is required.');
            return;
        }

        try {
            const success = await UserManager.updateStation(editingId, editName.trim(), criteria);
            if (success) {
                setSuccess('Station updated successfully.');
                setEditingId(null);
                setEditName('');
                setEditCriteria('');
                setError('');
                await loadStations();
            } else {
                setError('Failed to update station.');
            }
        } catch (err) {
            setError('Failed to update station.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this station? This action cannot be undone.')) {
            return;
        }

        try {
            const success = await UserManager.deleteStation(id);
            if (success) {
                setSuccess('Station deleted successfully.');
                setError('');
                await loadStations();
            } else {
                setError('Failed to delete station.');
            }
        } catch (err) {
            setError('Failed to delete station.');
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Station Management</h1>
                    <p>Manage stations, their names, and evaluation criteria.</p>
                    {error && <div className="message error-message">{error}</div>}
                    {success && <div className="message success-message">{success}</div>}

                    <div className="station-list">
                        {stations.map((station) => (
                            <div key={station.id} className="station-card">
                                {editingId === station.id ? (
                                    <div className="edit-form">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Station name"
                                        />
                                        <textarea
                                            value={editCriteria}
                                            onChange={(e) => setEditCriteria(e.target.value)}
                                            placeholder="Criteria (one per line)"
                                            rows={4}
                                        />
                                        <div className="button-group">
                                            <button onClick={handleSaveEdit}>Save</button>
                                            <button onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="station-info">
                                        <h3>{station.name}</h3>
                                        <ul>
                                            {station.criteria.map((criterion, idx) => (
                                                <li key={idx}>{criterion}</li>
                                            ))}
                                        </ul>
                                        <div className="button-group">
                                            <button onClick={() => handleEdit(station)}>Edit</button>
                                            <button onClick={() => handleDelete(station.id)} className="delete-btn">Delete</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="create-station">
                        <h2>Create New Station</h2>
                        <div className="form-group">
                            <label htmlFor="station-name">Station Name</label>
                            <input
                                id="station-name"
                                type="text"
                                value={newStationName}
                                onChange={(e) => setNewStationName(e.target.value)}
                                placeholder="Enter station name"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="station-criteria">Evaluation Criteria</label>
                            <textarea
                                id="station-criteria"
                                value={newStationCriteria}
                                onChange={(e) => setNewStationCriteria(e.target.value)}
                                placeholder="Enter criteria, one per line"
                                rows={6}
                            />
                        </div>
                        <button className="button primary" onClick={handleCreate}>Create Station</button>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}