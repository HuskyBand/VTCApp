import UserManager from "@client/stores/UserManager";
import { useNavigate } from "react-router";

export default function HomePage() {
	const nav = useNavigate();

    return (
    <>
        <section id="center">
            <div>
                <h1>Home</h1>
                <h2>Welcome, {UserManager.name}!</h2>
                <p>Press the button to do a fake logout!</p>
                <button onClick={() => {
                    nav('/logout');
                }}>Logout</button>
            </div>
        </section>
    </>
    );
}