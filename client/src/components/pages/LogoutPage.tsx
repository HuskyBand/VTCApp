import UserManager from '@client/stores/UserManager';
import React from 'react';
import { useNavigate } from 'react-router';

export default function LogoutPage() {
    UserManager.clear();
	UserManager.saveToStorage();

	const nav = useNavigate();
    const [redirectState, setRedirectState] = React.useState(false);

    setTimeout(() => {
        setRedirectState(true);
    }, 1000);

	React.useEffect(() => {
        if (redirectState) {
            nav('/');
        }
	});

    return (
    <>
        <h2>Logging out...</h2>
    </>
    );
}