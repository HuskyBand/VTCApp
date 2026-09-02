import UserManager from '@client/stores/UserManager';
import React from 'react';
import { NavLink, useNavigate } from 'react-router';

type ErrorBody = {
	error: string
}

export default function ResetPasswordPage() {
	const nav = useNavigate();
	const [credentials, setCredentials] = React.useState({ username: '', email: '', password: '', confirmPassword: '' });
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

		if (credentials.password !== credentials.confirmPassword) {
			setError("Unable to reset password: Passwords do not match");
			return;
		}

		try {
			await UserManager.resetPassword(credentials.username, credentials.email, credentials.password);

			if (UserManager.isLoggedIn) {
				nav('/');
			} else {
				nav('/login');
			}
		} catch (err) {
			if (typeof err === 'string') {
				console.error(`Failed to reset password: ${err}`);
				setError(`Unable to reset password: ${err}`);
			} else if (err instanceof String) {
				console.error(`Failed to reset password: ${err}`);
				setError(`Unable to reset password: ${err}`);
			} else {
				console.error(`UNKNOWN ERROR!!! Failed to reset password: ${JSON.stringify(err)}`);
				setError(`An error occurred while resetting password. Please report this message.`);
			}
		}
	};

	return (
		<main className="center-section">
			<section className="auth-form-container">
				<div className="auth-header">
					<h1>Reset Password</h1>
					<p>Reset the password for your VTC account</p>
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
						<label htmlFor="username">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							value={credentials.email}
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
					<div className="form-group">
						<label htmlFor="password">Confirm Password</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							value={credentials.confirmPassword}
							onChange={handleChange}
							required
							className="text-input"
						/>
					</div>
					{error && <p className="error-message">{error}</p>}
					<button type="submit" className="button primary auth-submit">Reset Password</button>
				</form>
				<div className="auth-footer">
					<p>Don't have an account? <NavLink to="/register">Create one</NavLink></p>
				</div>
			</section>
		</main>
	);
}