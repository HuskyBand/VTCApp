import { useState } from "react";
import BottomNav from "../BottomNav";

export default function CriteriaDetail() {
    const [current, setCurrent] = useState(1);
    const total = 4;

    // Mock data
    const criteria = {
        name: 'Criteria 1',
        developing: 'Developing explanation',
        satisfactory: 'Satisfactory explanation',
        mastery: 'Mastery explanation'
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h1>{criteria.name} ({current}/{total})</h1>
                <div className="status-blocks">
                    <div className="status-block">
                        <h3>Developing</h3>
                        <p>{criteria.developing}</p>
                    </div>
                    <div className="status-block">
                        <h3>Satisfactory</h3>
                        <p>{criteria.satisfactory}</p>
                    </div>
                    <div className="status-block">
                        <h3>Mastery</h3>
                        <p>{criteria.mastery}</p>
                    </div>
                </div>
                <div className="modal-buttons">
                    <button className="btn" onClick={() => setCurrent(Math.max(1, current - 1))}>Previous</button>
                    <button className="btn" onClick={() => setCurrent(Math.min(total, current + 1))}>Next</button>
                </div>
                <button className="close-btn">Close</button>
            </div>
            <BottomNav />
        </div>
    );
}