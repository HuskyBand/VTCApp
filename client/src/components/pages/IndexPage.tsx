import UserManager from "@client/stores/UserManager";
import HomePage from "./HomePage";
import OnboardingPage from "./OnboardingPage";

import './IndexPage.css';

export default function IndexPage() {
    return (
    <>
        {UserManager.isLoggedIn ? <HomePage /> : <OnboardingPage />}
    </>
    );
}