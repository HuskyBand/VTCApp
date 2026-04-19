import { useState } from "react";
import { useParams } from "react-router";
import BottomNav from "../BottomNav";

export default function StationEvaluationSearch() {
    const { id } = useParams();
    const [search, setSearch] = useState('');

    // Mock data
    const station = { name: `Station ${id}`, evaluations: [
        { name: 'John Doe', criteria: [{ name: 'Criteria 1', status: 'Satisfactory' }] }
    ] };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Developing': return 'purple';
            case 'Satisfactory': return 'grey';
            case 'Exemplary': return 'gold';
            default: return 'grey';
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>{station.name}</h1>
                    <div className="tabs">
                        <button className="tab active">Begin Evaluation</button>
                        <button className="tab">View Full Rubric</button>
                        <button className="tab">View Full Rubric Summary</button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search evaluations by name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-bar"
                    />
                    <div className="evaluation-results">
                        <p>Viewing {station.evaluations[0].name}'s evaluation results</p>
                        <div className="criteria-rows">
                            {station.evaluations[0].criteria.map((crit, idx) => (
                                <div key={idx} className="criteria-row">
                                    <div className="criteria-info">
                                        <div className="criteria-name">{crit.name}</div>
                                        <div className="criteria-desc">Description</div>
                                    </div>
                                    <div className={`status-badge ${getStatusColor(crit.status)}`}>{crit.status}</div>
                                    <div className="edit-icon">✏️</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}