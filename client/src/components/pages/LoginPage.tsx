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
            UserManager.setDevUser("awawawawa", "Testeroni", "Testerson");
            nav('/');
        }}>Login</button>
    </>
    );
}