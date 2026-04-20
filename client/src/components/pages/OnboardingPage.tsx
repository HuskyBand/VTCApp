export default function OnboardingPage() {
    return (
    <>
        <section className="center-section">
            <div id="vtc-hero">
                <h1>VTC</h1>
                <h2>Visual Training Circuit</h2>
            </div>
            <div className="content-direction-right content-spacing-small">
                <a href="/register"><button className="sign-in-button">Sign Up</button></a>
                <a href="/login"><button className="dark sign-in-button">Log In</button></a>
            </div>
        </section>
    </>
    );
}