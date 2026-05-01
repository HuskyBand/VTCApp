import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import PermissionManager from "@client/stores/PermissionManager";
import UserManager from "@client/stores/UserManager";
import { canEvaluateStation, canTeachStation, type EvaluationRecord } from "@client/utils/evaluationHelpers";

type Station = {
    id: number;
    name: string;
};

const stations: Station[] = [
    { id: 1, name: 'Station 1' },
    { id: 2, name: 'Station 2' },
    { id: 3, name: 'Station 3' },
    { id: 4, name: 'Station 4' },
    { id: 5, name: 'Station 5' },
    { id: 6, name: 'Station 6' },
];

export default function EvaluateSelectStation() {
    const nav = useNavigate();
    const [selectedStation, setSelectedStation] = useState<number | null>(null);
    const [accessibleStationIds, setAccessibleStationIds] = useState<number[]>([]);
    const [loaded, setLoaded] = useState(false);
    const canEvaluate = PermissionManager.canEvaluate();

    useEffect(() => {
        const loadAccessibility = async () => {
            if (canEvaluate) {
                setAccessibleStationIds(stations.map((station) => station.id));
                setLoaded(true);
                return;
            }

            if (!UserManager.isLoggedIn) {
                setAccessibleStationIds([]);
                setLoaded(true);
                return;
            }

            const evaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
            const allowed = stations
                .filter((station) =>
                    canEvaluateStation(evaluations as EvaluationRecord[], station.id) ||
                    canTeachStation(evaluations as EvaluationRecord[], station.id)
                )
                .map((station) => station.id);

            setAccessibleStationIds(allowed);
            setLoaded(true);
        };

        loadAccessibility();
    }, [canEvaluate]);

    const handleSelect = () => {
        if (selectedStation && accessibleStationIds.includes(selectedStation)) {
            nav(`/evaluate/station/${selectedStation}`);
        }
    };

    const isStationAccessible = (stationId: number) => accessibleStationIds.includes(stationId);

    return (
        <>
            <section id="center">
                <div>
                    <h1>Select a Station</h1>
                    <h2>Only the stations you can evaluate are active.</h2>
                    {!loaded ? (
                        <p>Loading available stations...</p>
                    ) : (
                        <>
                            <div className="stations-select-list">
                                {stations.map((station) => {
                                    const accessible = isStationAccessible(station.id);
                                    return (
                                        <div
                                            key={station.id}
                                            className={`station-select-row ${selectedStation === station.id ? 'selected' : ''} ${accessible ? '' : 'disabled'}`}
                                            onClick={() => accessible && setSelectedStation(station.id)}
                                            aria-disabled={!accessible}
                                        >
                                            <input
                                                type="radio"
                                                name="station"
                                                value={station.id}
                                                checked={selectedStation === station.id}
                                                onChange={() => accessible && setSelectedStation(station.id)}
                                                disabled={!accessible}
                                            />
                                            <label>{station.name}</label>
                                            {!accessible && <span className="station-locked">Locked</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                className="btn submit-btn"
                                onClick={handleSelect}
                                disabled={!selectedStation || !isStationAccessible(selectedStation)}
                            >
                                Continue
                            </button>
                            <p className="hint-text">Stations that are locked are not available yet.</p>
                        </>
                    )}
                </div>
            </section>
            <BottomNav />
        </>
    );
}
