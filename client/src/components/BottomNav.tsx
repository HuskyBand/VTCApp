import { useEffect, useState } from "react";
import { Link } from "react-router";
import PermissionManager from "@client/stores/PermissionManager";
import UserManager from "@client/stores/UserManager";
import {
    canEvaluateStation,
    canTeachStation,
    type EvaluationRecord,
} from "@client/utils/evaluationHelpers";

const stations = [1, 2, 3, 4, 5, 6];

export default function BottomNav() {
    const canViewAdmin = PermissionManager.canViewAdmin();
    const canEvaluate = PermissionManager.canEvaluate();
    const [hasProgressAccess, setHasProgressAccess] = useState(false);

    useEffect(() => {
        const loadProgressAccess = async () => {
            if (!UserManager.isLoggedIn || canEvaluate) return;
            try {
                const evaluations = await UserManager.getEvaluationsForUser(UserManager.currentUser.id!);
                const accessible = stations.some((stationId) =>
                    canEvaluateStation(evaluations as EvaluationRecord[], stationId) ||
                    canTeachStation(evaluations as EvaluationRecord[], stationId)
                );
                setHasProgressAccess(accessible);
            } catch {
                setHasProgressAccess(false);
            }
        };
        loadProgressAccess();
    }, [canEvaluate]);

    const showEvaluate = canViewAdmin || canEvaluate || hasProgressAccess;
    const showQR = UserManager.isLoggedIn && !canViewAdmin;

    return (
        <nav className="bottom-nav">
            <Link to="/" className="nav-item">Home</Link>
            {showQR && <Link to="/get-evaluated" className="nav-item">My QR</Link>}
            {showEvaluate && <Link to="/evaluate" className="nav-item">Evaluate</Link>}
            {canEvaluate && !canViewAdmin && <Link to="/station-reference" className="nav-item">Reference</Link>}
            <Link to="/profile" className="nav-item">Profile</Link>
            {canViewAdmin && <Link to="/admin/overview" className="nav-item">Director</Link>}
        </nav>
    );
}
