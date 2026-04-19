import { useNavigate } from "react-router";
import BottomNav from "../BottomNav";
import PermissionManager, { UserPermission } from "@client/stores/PermissionManager";
import { useState } from "react";

type Station = {
    id: number;
    name: string;
    status: 'completed' | 'in_progress' | 'not_started';
};

const stations: Station[] = [
    { id: 1, name: 'Station 1', status: 'not_started' },
    { id: 2, name: 'Station 2', status: 'not_started' },
    { id: 3, name: 'Station 3', status: 'not_started' },
    { id: 4, name: 'Station 4', status: 'not_started' },
    { id: 5, name: 'Station 5', status: 'not_started' },
    // Add more as needed
];

const getStatusIndicator = (status: string) => {
    switch (status) {
        case 'completed': return '🟢';
        case 'in_progress': return '🟡';
        case 'not_started': return '🔴';
        default: return '🔴';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'completed': return 'Completed';
        case 'in_progress': return 'In Progress';
        case 'not_started': return 'Not Yet Started';
        default: return 'Not Yet Started';
    }
};

export default function HomePage() {
    const nav = useNavigate();
    const [permission, setPermission] = useState(PermissionManager.permission);

    const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPermission = e.target.value as UserPermission;
        PermissionManager.permission = newPermission;
        setPermission(newPermission);
    };

    return (
        <>
            <section id="center">
                <div>
                    <div className="header-with-dropdown">
                        <div>
                            <h1>Home</h1>
                            <h2>Status</h2>
                        </div>
                        <div className="permission-selector">
                            <label htmlFor="permission">Test Permission:</label>
                            <select
                                id="permission"
                                value={permission}
                                onChange={handlePermissionChange}
                                className="permission-dropdown"
                            >
                                {PermissionManager.getAllPermissions().map(perm => (
                                    <option key={perm} value={perm}>
                                        {PermissionManager.getPermissionLabel(perm as UserPermission)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="stations-list">
                        {stations.map(station => (
                            <div key={station.id} className="station-row" onClick={() => nav(`/station/${station.id}`)}>
                                <div className="status-indicator">{getStatusIndicator(station.status)}</div>
                                <div className="station-info">
                                    <div className="station-name">{station.name}</div>
                                    <div className="station-status">{getStatusLabel(station.status)}</div>
                                </div>
                                <div className="edit-icon">✏️</div>
                            </div>
                        ))}
                    </div>
                    {PermissionManager.canViewAdmin() && (
                        <button className="new-station-btn">+ New Station</button>
                    )}
                    <p>Press the button to do a fake logout!</p>
                    <button onClick={() => {
                        nav('/logout');
                    }}>Logout</button>
                </div>
            </section>
            <BottomNav />
        </>
    );
}