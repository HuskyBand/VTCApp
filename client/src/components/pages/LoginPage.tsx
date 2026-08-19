import UserManager from '@client/stores/UserManager';
import React from 'react';
import { NavLink, useNavigate } from 'react-router';

export default function LoginPage() {
	const nav = useNavigate();
	const [credentials, setCredentials] = React.useState({ username: '', password: '' });
	const [error, setError] = React.useState('');

	React.useEffect(() => {
		if (UserManager.isLoggedIn) {
			nav('/');
		}
	}, [nav]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setCredentials({
			...credentials,
			[e.target.name]: e.target.value
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const success = await UserManager.loginWithPassword(credentials.username, credentials.password);
		if (success) {
			nav('/');
			return;
		}
		setError('Unable to log in. Check your username and password.');
	};

	return (
		<main className="center-section">
			<section className="auth-form-container">
				<div className="auth-header">
					<h1>Welcome back</h1>
					<p>Sign in to your account</p>
				</div>
				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="username">Username</label>
						<input
							id="username"
							name="username"
							type="text"
							value={credentials.username}
							onChange={handleChange}
							required
							className="text-input"
						/>
					</div>
					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							value={credentials.password}
							onChange={handleChange}
							required
							className="text-input"
						/>
					</div>
					{error && <p className="error-message">{error}</p>}
					<button type="submit" className="button primary auth-submit">Sign in</button>
				</form>
				<div className="auth-footer">
					<p>Don't have an account? <NavLink to="/register">Create one</NavLink></p>
				</div>
			</section>
		</main>
	);
}