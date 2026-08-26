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

    const showQR = false; // UserManager.isLoggedIn && !canViewAdmin;
    const showEvaluate = false; // canViewAdmin || canEvaluateAnywhere;
    const showReference = hasAnyStationRole && !canViewAdmin;

    return (
        <nav className="bottom-nav">
            <Link to="/" className="nav-item">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--accent)">
                    <path d="M9 21H7C4.79086 21 3 19.2091 3 17V10.7076C3 9.30887 3.73061 8.01175 4.92679 7.28679L9.92679 4.25649C11.2011 3.48421 12.7989 3.48421 14.0732 4.25649L19.0732 7.28679C20.2694 8.01175 21 9.30887 21 10.7076V17C21 19.2091 19.2091 21 17 21H15M9 21V17C9 15.3431 10.3431 14 12 14V14C13.6569 14 15 15.3431 15 17V21M9 21H15" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <div>Home</div>
            </Link>
            {showQR && <Link to="/get-evaluated" className="nav-item">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--accent)">
                    <path d="M15 12L15 15" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 3V6" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M18 12L18 15" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 18L21 18" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M18 21H21" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M6 12H9" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M6 6.01111L6.01 6" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 12.0111L12.01 12" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M3 12.0111L3.01 12" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 9.01111L12.01 9" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 15.0111L12.01 15" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M15 21.0111L15.01 21" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 21.0111L12.01 21" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M21 12.0111L21.01 12" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M21 15.0111L21.01 15" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M18 6.01111L18.01 6" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M9 3.6V8.4C9 8.73137 8.73137 9 8.4 9H3.6C3.26863 9 3 8.73137 3 8.4V3.6C3 3.26863 3.26863 3 3.6 3H8.4C8.73137 3 9 3.26863 9 3.6Z" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M21 3.6V8.4C21 8.73137 20.7314 9 20.4 9H15.6C15.2686 9 15 8.73137 15 8.4V3.6C15 3.26863 15.2686 3 15.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M6 18.0111L6.01 18" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M9 15.6V20.4C9 20.7314 8.73137 21 8.4 21H3.6C3.26863 21 3 20.7314 3 20.4V15.6C3 15.2686 3.26863 15 3.6 15H8.4C8.73137 15 9 15.2686 9 15.6Z" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <div>My QR</div>
            </Link>}
            {showEvaluate && <Link to="/evaluate" className="nav-item">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--accent)">
                    <path d="M20 12V5.74853C20 5.5894 19.9368 5.43679 19.8243 5.32426L16.6757 2.17574C16.5632 2.06321 16.4106 2 16.2515 2H4.6C4.26863 2 4 2.26863 4 2.6V21.4C4 21.7314 4.26863 22 4.6 22H11" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M8 10H16M8 6H12M8 14H11" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M17.9541 16.9394L18.9541 15.9394C19.392 15.5015 20.102 15.5015 20.5399 15.9394V15.9394C20.9778 16.3773 20.9778 17.0873 20.5399 17.5252L19.5399 18.5252M17.9541 16.9394L14.963 19.9305C14.8131 20.0804 14.7147 20.2741 14.6821 20.4835L14.4394 22.0399L15.9957 21.7973C16.2052 21.7646 16.3988 21.6662 16.5487 21.5163L19.5399 18.5252M17.9541 16.9394L19.5399 18.5252" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M16 2V5.4C16 5.73137 16.2686 6 16.6 6H20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <div>Evaluate</div>
            </Link>}
            {showReference && <Link to="/station-reference" className="nav-item">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--accent)">
                    <path d="M4 19V5C4 3.89543 4.89543 3 6 3H19.4C19.7314 3 20 3.26863 20 3.6V16.7143" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round"></path>
                    <path d="M6 17L20 17" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round"></path>
                    <path d="M6 21L20 21" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round"></path>
                    <path d="M6 21C4.89543 21 4 20.1046 4 19C4 17.8954 4.89543 17 6 17" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M9 7L15 7" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round"></path>
                </svg>
                <div>Reference</div>
            </Link>}
            {canViewAdmin && <Link to="/admin/overview" className="nav-item">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--accent)">
                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <div>Director</div>
            </Link>}
            <Link to="/profile" className="nav-item">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="var(--accent)">
                    <path d="M5 20V19C5 15.134 8.13401 12 12 12V12C15.866 12 19 15.134 19 19V20" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="var(--accent)" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
                <div>Profile</div>
            </Link>
        </nav>
    );
}
