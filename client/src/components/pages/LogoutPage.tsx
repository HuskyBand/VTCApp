import { Endpoints } from '@client/Endpoints';
import http from '@client/http/HttpClient';
import UserManager from '@client/stores/UserManager';
import React from 'react';
import { useNavigate } from 'react-router';

export default function LogoutPage() {
	const nav = useNavigate();
    const [redirectState, setRedirectState] = React.useState(false);

    React.useEffect(() => {
        async function logoutActually() {
            let response = await http.post(Endpoints.AUTH_LOGOUT);

            if (response.ok) {
                UserManager.clear(); // Is this necessary?
            } else {
                // TODO: Error better here.
                console.error('Something went wrong while logging out.');
            }

            setRedirectState(true);
        }

        logoutActually().catch((err) => {
            console.error(`Something went wrong while logging out: ${err}`);
        });
    });

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