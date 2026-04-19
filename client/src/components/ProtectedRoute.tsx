import type { ReactNode } from "react";
import { Navigate } from "react-router";
import PermissionManager from "@client/stores/PermissionManager";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission: (perm: typeof PermissionManager) => boolean;
    fallbackRoute?: string;
}

export default function ProtectedRoute({
    children,
    requiredPermission,
    fallbackRoute = '/'
}: ProtectedRouteProps) {
    if (!requiredPermission(PermissionManager)) {
        return <Navigate to={fallbackRoute} replace />;
    }

    return <>{children}</>;
}
