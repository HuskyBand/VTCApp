export default function OnboardingPage() {
    return (
        <main className="center-section onboarding-screen">
            <section id="vtc-hero">
                <h1>VTC</h1>
                <div className="hero-actions">
                    <a href="/register" className="button primary">
                        Create account
                    </a>
                    <a href="/login" className="button secondary">
                        Log in
                    </a>
                </div>
            </section>
        </main>
    );
}