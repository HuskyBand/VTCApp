import React from "react";
import { useNavigate } from "react-router";

export default function NotFoundPage() {
	const nav = useNavigate();

    React.useEffect(() => {
        nav('/');
    })

    console.error(`Could not find "${location.toString()}". Redirecting to home...`);

    return (<></>);
}