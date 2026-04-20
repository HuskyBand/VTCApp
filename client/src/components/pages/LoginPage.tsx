import UserManager from '@client/stores/UserManager';
import React from 'react';
import { useNavigate } from 'react-router';

export default function LoginPage() {
	const nav = useNavigate();

	React.useEffect(() => {
		if (UserManager.isLoggedIn) {
			nav('/');
		}
	});

    return (
    <>
        <h1>LOGIN</h1>
        <p>Press the button to do a fake login!</p>
        <button onClick={() => {
            UserManager.setUser("awawawawa", {
                username: "testeroni",
                firstName: "Tester",
                lastName: "von Testerson",
                permFlags: 0
            });
            nav('/');
        }}>Login</button>
    </>
    );
}