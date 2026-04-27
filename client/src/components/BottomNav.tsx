import { Link } from "react-router";
import PermissionManager from "@client/stores/PermissionManager";

export default function BottomNav() {
    const canViewAdmin = PermissionManager.canViewAdmin();
    const canEvaluate = PermissionManager.canEvaluate();

    return (
        <nav className="bottom-nav">
            <Link to="/" className="nav-item">Home</Link>
            {canEvaluate && <Link to="/evaluate" className="nav-item">Evaluate</Link>}
            <Link to="/profile" className="nav-item">Profile</Link>
            {canViewAdmin && <Link to="/admin/edit-vtc" className="nav-item">Admin</Link>}
        </nav>
    );
}