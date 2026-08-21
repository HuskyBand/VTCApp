import { useEffect, useState } from "react";
import { Link } from "react-router";
import UserManager from "@client/stores/UserManager";

export default function BottomNav() {
    const canViewAdmin = UserManager.isDirector;
    const [canEvaluateAnywhere, setCanEvaluateAnywhere] = useState(UserManager.isDirector || UserManager.isElevated);
    const [hasAnyStationRole, setHasAnyStationRole] = useState(UserManager.isDirector || UserManager.isElevated);

    useEffect(() => {
        const loadStationAccess = async () => {
            if (!UserManager.isLoggedIn) return;
            if (UserManager.isDirector || UserManager.isElevated) {
                setCanEvaluateAnywhere(true);
                setHasAnyStationRole(true);
                return;
            }
            try {
                const stations = await UserManager.getStations();
                const evaluatorSomewhere = (stations ?? []).some((s) => s.role === 'evaluator');
                const roleSomewhere = (stations ?? []).some((s) => s.role === 'evaluator' || s.role === 'instructor');
                setCanEvaluateAnywhere(evaluatorSomewhere);
                setHasAnyStationRole(roleSomewhere);
            } catch {
                setCanEvaluateAnywhere(false);
                setHasAnyStationRole(false);
            }
        };
        loadStationAccess();
    }, []);

    const showEvaluate = canViewAdmin || canEvaluateAnywhere;
    const showQR = UserManager.isLoggedIn && !canViewAdmin;

    return (
        <nav className="bottom-nav">
            <Link to="/" className="nav-item">Home</Link>
            {showQR && <Link to="/get-evaluated" className="nav-item">My QR</Link>}
            {showEvaluate && <Link to="/evaluate" className="nav-item">Evaluate</Link>}
            {hasAnyStationRole && !canViewAdmin && <Link to="/station-reference" className="nav-item">Reference</Link>}
            <Link to="/profile" className="nav-item">Profile</Link>
            {canViewAdmin && <Link to="/admin/overview" className="nav-item">Director</Link>}
        </nav>
    );
}
