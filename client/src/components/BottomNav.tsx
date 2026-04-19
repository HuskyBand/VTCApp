import { Link } from "react-router";
import PermissionManager from "@client/stores/PermissionManager";

export default function BottomNav() {
    const canViewAdmin = PermissionManager.canViewAdmin();

    return (
        <nav className="bottom-nav">
            <Link to="/" className="nav-item">Home</Link>
            <Link to="/evaluate" className="nav-item">Evaluate</Link>
            {canViewAdmin && <Link to="/admin/edit-vtc" className="nav-item">Admin</Link>}
        </nav>
    );
}