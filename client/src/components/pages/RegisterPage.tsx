import UserManager from '@client/stores/UserManager';
import React from 'react';
import { useNavigate } from 'react-router';

export default function RegisterPage() {
	const nav = useNavigate();
	const [formData, setFormData] = React.useState({
		username: '',
		password: '',
		email: '',
		firstName: '',
		lastName: '',
		instrument: ''
	});
	const [error, setError] = React.useState('');

	React.useEffect(() => {
		if (UserManager.isLoggedIn) {
			nav('/');
		}
	}, [nav]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const result = await UserManager.register({
			username: formData.username,
			password: formData.password,
			email: formData.email,
			firstName: formData.firstName,
			lastName: formData.lastName,
			instrument: formData.instrument
		});

		if (result.success) {
			nav('/');
			return;
		}

		setError(result.message ?? 'Unable to register; email or username is already in use.');
	};

    return (
        <main className="center-section">
            <section className="auth-form-container">
                <div className="auth-header">
                    <h1>Create your account</h1>
                    <p>Join the Visual Training Circuit</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="text-input"
                        />
                        <p className="field-hint">Your username is permanent and can't be changed later — choose carefully.</p>
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="text-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            className="text-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                            className="text-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="instrument">Instrument</label>
                        <input
                            id="instrument"
                            name="instrument"
                            type="text"
                            value={formData.instrument}
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
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="text-input"
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="button primary auth-submit">Create account</button>
                </form>
                <div className="auth-footer">
                    <p>Already have an account? <a href="/login">Sign in</a></p>
                </div>
            </section>
        </main>
    );
}