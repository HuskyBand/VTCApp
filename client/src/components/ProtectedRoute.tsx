import type { ReactNode } from "react";
import { Navigate } from "react-router";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission: () => boolean;
    fallbackRoute?: string;
}

export default function ProtectedRoute({
    children,
    requiredPermission,
    fallbackRoute = '/'
}: ProtectedRouteProps) {
    if (!requiredPermission()) {
        return <Navigate to={fallbackRoute} replace />;
    }

    return <>{children}</>;
}
