import { useState } from "react";
import BottomNav from "../BottomNav";

type CriteriaItem = {
    id: number;
    label: string;
    status: 'developing' | 'satisfactory' | 'mastery';
};

type Criterion = {
    id: number;
    name: string;
    items: CriteriaItem[];
};

export default function EditVTC() {
    const [mainPoints, setMainPoints] = useState(['Point 1', 'Point 2']);
    const [criteria, setCriteria] = useState<Criterion[]>([
        {
            id: 1,
            name: 'Criteria 1',
            items: [
                { id: 1, label: 'Not yet', status: 'developing' },
                { id: 2, label: 'In progress', status: 'developing' },
                { id: 3, label: 'Satisfactory', status: 'satisfactory' },
                { id: 4, label: 'Exceeding Standard', status: 'mastery' }
            ]
        },
        {
            id: 2,
            name: 'Criteria 2',
            items: [
                { id: 5, label: 'Not yet', status: 'developing' },
                { id: 6, label: 'In progress', status: 'developing' },
                { id: 7, label: 'Satisfactory', status: 'satisfactory' },
                { id: 8, label: 'Exceeding Standard', status: 'mastery' }
            ]
        },
    ]);
    const [freeName, setFreeName] = useState('');

    const handleEditPoint = (idx: number, value: string) => {
        const newPoints = [...mainPoints];
        newPoints[idx] = value;
        setMainPoints(newPoints);
    };

    const handleEditCriteria = (critIdx: number, value: string) => {
        const newCriteria = [...criteria];
        newCriteria[critIdx].name = value;
        setCriteria(newCriteria);
    };

    const handleEditItem = (critIdx: number, itemIdx: number, value: string) => {
        const newCriteria = [...criteria];
        newCriteria[critIdx].items[itemIdx].label = value;
        setCriteria(newCriteria);
    };

    const handleEditItemStatus = (critIdx: number, itemIdx: number, status: 'developing' | 'satisfactory' | 'mastery') => {
        const newCriteria = [...criteria];
        newCriteria[critIdx].items[itemIdx].status = status;
        setCriteria(newCriteria);
    };

    return (
        <>
            <section id="center">
                <div>
                    <h1>Edit VTC</h1>
                    <div className="rubric-edits">
                        <h3>Rubric Edits</h3>
                        <div className="main-points-edit">
                            <h4>Station Main Points</h4>
                            {mainPoints.map((point, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    value={point}
                                    onChange={(e) => handleEditPoint(idx, e.target.value)}
                                    className="edit-input"
                                />
                            ))}
                        </div>
                        <div className="criteria-edits">
                            {criteria.map((crit, critIdx) => (
                                <div key={crit.id} className="criteria-edit">
                                    <input
                                        type="text"
                                        value={crit.name}
                                        onChange={(e) => handleEditCriteria(critIdx, e.target.value)}
                                        className="edit-input criteria-name-input"
                                        placeholder="Criteria name"
                                    />
                                    <div className="items-list">
                                        {crit.items.map((item, itemIdx) => (
                                            <div key={item.id} className="item-row">
                                                <input
                                                    type="text"
                                                    value={item.label}
                                                    onChange={(e) => handleEditItem(critIdx, itemIdx, e.target.value)}
                                                    className="edit-input item-label-input"
                                                    placeholder="Item description"
                                                />
                                                <select
                                                    value={item.status}
                                                    onChange={(e) => handleEditItemStatus(critIdx, itemIdx, e.target.value as 'developing' | 'satisfactory' | 'mastery')}
                                                    className="status-select"
                                                >
                                                    <option value="developing">Developing</option>
                                                    <option value="satisfactory">Satisfactory</option>
                                                    <option value="mastery">Mastery</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="check-section">
                        <h3>Check Bold Marker Status</h3>
                        <p>Status: OK</p>
                    </div>
                    <div className="free-name">
                        <label>Free Name:</label>
                        <input
                            type="text"
                            value={freeName}
                            onChange={(e) => setFreeName(e.target.value)}
                            className="edit-input"
                        />
                    </div>
                </div>
            </section>
            <BottomNav />
        </>
    );
}