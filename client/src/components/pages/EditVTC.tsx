import { useEffect, useState } from "react";
import BottomNav from "../BottomNav";
import UserManager from "@client/stores/UserManager";

type LevelDescription = {
    label: string;
    description: string;
};

type Criterion = {
    id: number;
    name: string;
    levels: LevelDescription[];
};

type StationOption = {
    id: number;
    name: string;
};

const defaultLevels: LevelDescription[] = [
    { label: 'Not Yet', description: '' },
    { label: 'In Progress', description: '' },
    { label: 'Satisfactory', description: '' },
    { label: 'Exceeding Standard', description: '' }
];

export default function EditVTC() {
    const [stations, setStations] = useState<StationOption[]>([]);
    const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStations = async () => {
        const stationList = await UserManager.getStations();
        setStations(stationList.map((station) => ({ id: station.id, name: station.name })));
        if (stationList.length > 0) {
            setSelectedStationId(stationList[0].id);
        }
    };

    const loadStationCriteria = async (stationId: number) => {
        const station = await UserManager.getStationById(stationId);
        if (!station) {
            setCriteria([]);
            return;
        }

        const loadedCriteria = Array.isArray(station.criteria) ? station.criteria : [];
        setCriteria(
            loadedCriteria.map((name: string, index: number) => ({
                id: index + 1,
                name,
                levels: defaultLevels.map((level) => ({ ...level }))
            }))
        );
    };

    useEffect(() => {
        const bootstrap = async () => {
            await loadStations();
            setLoading(false);
        };
        bootstrap();
    }, []);

    useEffect(() => {
        if (selectedStationId !== null) {
            loadStationCriteria(selectedStationId);
        }
    }, [selectedStationId]);

    const handleStationChange = (stationId: number) => {
        setSelectedStationId(stationId);
        setMessage(null);
    };

    const handleCriterionNameChange = (critIdx: number, value: string) => {
        setCriteria((current) => {
            const next = [...current];
            next[critIdx] = { ...next[critIdx], name: value };
            return next;
        });
    };

    const handleLevelDescriptionChange = (critIdx: number, levelIdx: number, value: string) => {
        setCriteria((current) => {
            const next = [...current];
            const criterion = { ...next[critIdx] };
            const levels = [...criterion.levels];
            levels[levelIdx] = { ...levels[levelIdx], description: value };
            criterion.levels = levels;
            next[critIdx] = criterion;
            return next;
        });
    };

    const handleSave = async () => {
        if (selectedStationId === null) {
            return;
        }

        const updatedNames = criteria.map((criterion) => criterion.name);
        const ok = await UserManager.updateStation(selectedStationId, undefined, updatedNames);
        setMessage(ok ? 'Criteria saved successfully.' : 'Unable to save criteria.');
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Edit VTC</h1>
                    <div className="station-selector">
                        <label htmlFor="station-select">Station</label>
                        <select
                            id="station-select"
                            value={selectedStationId ?? ''}
                            onChange={(e) => handleStationChange(Number(e.target.value))}
                        >
                            {stations.map((station) => (
                                <option key={station.id} value={station.id}>{station.name}</option>
                            ))}
                        </select>
                    </div>
                    {loading ? (
                        <p>Loading station criteria...</p>
                    ) : (
                        <>
                            <div className="criteria-edits">
                                {criteria.map((crit, critIdx) => (
                                    <div key={crit.id} className="criteria-edit">
                                        <input
                                            type="text"
                                            value={crit.name}
                                            onChange={(e) => handleCriterionNameChange(critIdx, e.target.value)}
                                            className="edit-input criteria-name-input"
                                            placeholder="Criterion name"
                                        />
                                        <div className="level-grid">
                                            {crit.levels.map((level, levelIdx) => (
                                                <div key={level.label} className="level-edit">
                                                    <label>{level.label}</label>
                                                    <textarea
                                                        value={level.description}
                                                        onChange={(e) => handleLevelDescriptionChange(critIdx, levelIdx, e.target.value)}
                                                        placeholder="Describe what this level means"
                                                        className="edit-textarea"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="btn submit-btn" onClick={handleSave}>Save Changes</button>
                            {message && <p className="action-message">{message}</p>}
                        </>
                    )}
                </div>
            </section>
            <BottomNav />
        </>
    );
}
