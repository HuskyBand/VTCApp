import type { StationListResponse } from "@api/station/Station";
import { Endpoints } from "@client/Endpoints";
import http from "@client/http/HttpClient";
import UserManager from "@client/stores/UserManager";
import { useNavigate } from "react-router";

export default function HomePage() {
	const nav = useNavigate();

    return (
    <>
        <section className="center-section">
            <div id="welcome">
                <h1>Home</h1>
                <h2>Welcome, {UserManager.name}!</h2>
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