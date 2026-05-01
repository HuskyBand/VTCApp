import { useParams, useNavigate } from "react-router";
import BottomNav from "../BottomNav";

export default function StationDetail() {
    const { id } = useParams();
    const nav = useNavigate();

    const station = {
        name: `Station ${id}`,
        criteria: ['Criteria 1', 'Criteria 2', 'Criteria 3']
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>{station.name}</h1>
                    <div className="tabs">
                        <button className="tab active" onClick={() => nav(`/station/${id}/get-evaluated`)}>Get Evaluated</button>
                        <button className="tab" onClick={() => nav(`/station/${id}/history`)}>History</button>
                    </div>
                    <div className="criteria-list">
                        <h2>Criteria</h2>
                        <ul>
                            {station.criteria.map((crit, idx) => (
                                <li key={idx}>{crit}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}
