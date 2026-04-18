import UserManager from "@client/stores/UserManager";
import { useNavigate } from "react-router";

// Assumed to be logged in if this page is loaded.
export default function HomePage() {
	const nav = useNavigate();

    return (
    <>
        <section className="center-section">
            <div id="welcome">
                <h1>Home</h1>
                <h2>Welcome, {UserManager.currentUser.firstName}!</h2>
            </div>
            <div id="station-buttons">
                <button onClick={() => {
                    nav('/station/1');
                }}>Logout</button>
            </div>
            <div id="fake-logout">
                <p>Press the button to do a fake logout!</p>
                <button onClick={() => {
                    nav('/logout');
                }}>Logout</button>
            </div>
        </section>
    </>
    );
}