import { useParams, useNavigate } from "react-router";
import BottomNav from "../BottomNav";

export default function StationDetail() {
    const { id } = useParams();
    const nav = useNavigate();

    // Mock data
    const station = { name: `Station ${id}`, criteria: [
        { name: 'Criteria 1', items: ['Not yet', 'In progress', 'Satisfactory', 'Exceeding Standard'] },
        { name: 'Criteria 2', items: ['Not yet', 'In progress', 'Satisfactory', 'Exceeding Standard'] },
        // Add more
    ] };

    return (
        <>
            <section id="center">
                <div>
                    <h1>{station.name}</h1>
                    <div className="tabs">
                        <button className="tab active" onClick={() => nav(`/station/${id}/get-evaluated`)}>Get Evaluated</button>
                        <button className="tab" onClick={() => nav(`/station/${id}/evaluate`)}>Evaluated</button>
                        <button className="tab" onClick={() => nav(`/station/${id}/search`)}>Evaluate</button>
                    </div>
                    <div className="criteria-list">
                        {station.criteria.map((crit, idx) => (
                            <div key={idx} className="criteria-section">
                                <h3>{crit.name}</h3>
                                <ul>
                                    {crit.items.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="rubric">
                        <h3>Rubric</h3>
                        <ul>
                            <li>Guidance text 1</li>
                            <li>Guidance text 2</li>
                        </ul>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}