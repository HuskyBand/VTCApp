import { useParams } from "react-router";
import BottomNav from "../BottomNav";

export default function StationEvaluationBegin() {
    const { id } = useParams();

    // Mock data
    const station = { name: `Station ${id}`, criteria: [
        { name: 'Criteria 1', description: 'Description 1', status: 'Developing' },
        { name: 'Criteria 2', description: 'Description 2', status: 'Satisfactory' },
    ] };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Developing': return 'purple';
            case 'Satisfactory': return 'grey';
            case 'Mastery': return 'gold';
            default: return 'grey';
        }
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>{station.name}</h1>
                    <div className="buttons">
                        <button className="btn">Begin Evaluation</button>
                        <button className="btn">History</button>
                    </div>
                    <div className="criteria-rows">
                        {station.criteria.map((crit, idx) => (
                            <div key={idx} className="criteria-row">
                                <div className="criteria-info">
                                    <div className="criteria-name">{crit.name}</div>
                                    <div className="criteria-desc">{crit.description}</div>
                                </div>
                                <div className={`status-badge ${getStatusColor(crit.status)}`}>{crit.status}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}