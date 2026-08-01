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

	const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const success = await UserManager.register({
			username: formData.username,
			password: formData.password,
			email: formData.email,
			firstName: formData.firstName,
			lastName: formData.lastName,
			instrument: formData.instrument
		});

		if (success) {
			nav('/');
			return;
		}

		setError('Unable to register. Please try again with a unique username and email.');
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
                        <select id="instrument"
                            name="instrument"
                            value={formData.instrument}
                            onChange={handleSelectChange}
                            required
                            className="text-input"> 
                            <option value="nil">-- Select an instrument --</option>
                            <optgroup label="Winds">
                                <option value="piccolo">Piccolo</option>
                                <option value="clarinet">Clarinet</option>
                                <option value="alto-sax">Alto Saxophone</option>
                                <option value="tenor-sax">Tenor Saxophone</option>
                                <option value="trumpet">Trumpet</option>
                                <option value="mellophone">Mellophone</option>
                                <option value="trombone">Trombone</option>
                                <option value="baritone">Baritone</option>
                                <option value="sousaphone">Sousaphone</option>
                            </optgroup>
                            <optgroup label="Drumline">
                            <option value="snare-drum">Snare Drum</option>
                            <option value="tenor-drums">Tenor Drums</option>
                            <option value="bass-drum">Bass Drum</option>
                            <option value="cymbals">Cymbals</option>
                            </optgroup>
                        </select>
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