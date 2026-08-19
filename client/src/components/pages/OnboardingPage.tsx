export default function OnboardingPage() {
    return (
        <main className="center-section onboarding-screen">
            <section id="vtc-hero">
                <div className="hero-badge">
                    <span className="eyebrow">🎵 Visual Training Circuit</span>
                </div>
                <h1>Keep every musician's evaluation progress in one place.</h1>
                <p>
                    Sign up or log in to manage stations, submit evaluations, and let your team stay aligned
                    on progress and permissions. Track improvement, celebrate achievements, and grow together.
                </p>
                <div className="hero-actions">
                    <NavLink to="/register" className="button primary">
                        <span className="button-icon">✨</span>
                        Create account
                    </NavLink>
                    <NavLink to="/login" className="button secondary">
                        <span className="button-icon">🔑</span>
                        Log in
                    </NavLink>
                </div>
                <div className="hero-features">
                    <div className="feature-item">
                        <span className="feature-icon">📊</span>
                        <span>Track Progress</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">👥</span>
                        <span>Team Collaboration</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🎯</span>
                        <span>Goal Setting</span>
                    </div>
                </div>
            </section>
        </main>
    );
}