import type { ReactNode } from "react";
import { Navigate } from "react-router";
import UserManager from "@client/stores/UserManager";

interface RequireAuthProps {
    children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
    if (!UserManager.isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
