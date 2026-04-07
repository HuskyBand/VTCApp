import UserManager from '@client/stores/UserManager';
import React from 'react';
import { useNavigate } from 'react-router';

export default function RegisterPage() {
	UserManager.loadFromStorage();

	const nav = useNavigate();

	React.useEffect(() => {
		if (UserManager.isLoggedIn) {
			nav('/');
		}
	});

    return (
    <>
        <h1>REGISTER</h1>
    </>
    );
}