import BottomNav from "../BottomNav";

export default function EvaluatePage() {
    // Mock data
    const evaluation = {
        name: 'John Doe',
        mainPoints: ['Point 1', 'Point 2'],
        criteria: [
            { name: 'Criteria 1', status: 'Satisfactory' },
            { name: 'Criteria 2', status: 'Exceeding Standard' },
        ]
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Evaluate</h1>
                    <div className="name-field">Name: {evaluation.name}</div>
                    <div className="main-points">
                        <h3>Station Main Points</h3>
                        <ul>
                            {evaluation.mainPoints.map((point, idx) => <li key={idx}>{point}</li>)}
                        </ul>
                    </div>
                    <div className="criteria-list">
                        {evaluation.criteria.map((crit, idx) => (
                            <div key={idx} className="criteria-section">
                                <h3>{crit.name}</h3>
                                <div className="status-label">{crit.status}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}