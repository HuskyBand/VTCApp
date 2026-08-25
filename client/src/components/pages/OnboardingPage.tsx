import { NavLink } from "react-router";

export default function OnboardingPage() {
    return (
        <main className="center-section onboarding-screen">
            <section id="vtc-hero">
                <h1>VTC</h1>
                <div className="hero-actions">
                    <NavLink to="/register" className="button primary">
                        Create account
                    </NavLink>
                    <NavLink to="/login" className="button secondary">
                        Log in
                    </NavLink>
                </div>
            </section>
        </main>
    );
}