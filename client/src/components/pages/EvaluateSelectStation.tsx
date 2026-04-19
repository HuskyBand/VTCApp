import { useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import { useState } from "react";

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
];

export default function EvaluateSelectStation() {
    const nav = useNavigate();
    const [selectedStation, setSelectedStation] = useState<number | null>(null);

    const handleSelect = () => {
        if (selectedStation) {
            nav(`/evaluate/station/${selectedStation}`);
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Select Station</h1>
                    <h2>Which station would you like to evaluate?</h2>
                    <div className="stations-select-list">
                        {stations.map(station => (
                            <div
                                key={station.id}
                                className={`station-select-row ${selectedStation === station.id ? 'selected' : ''}`}
                                onClick={() => setSelectedStation(station.id)}
                            >
                                <input
                                    type="radio"
                                    name="station"
                                    value={station.id}
                                    checked={selectedStation === station.id}
                                    onChange={() => setSelectedStation(station.id)}
                                />
                                <label>{station.name}</label>
                            </div>
                        ))}
                    </div>
                    <button
                        className="btn submit-btn"
                        onClick={handleSelect}
                        disabled={!selectedStation}
                    >
                        Continue
                    </button>
                </div>
            </section>
            <BottomNav />
        </>
    );
}
