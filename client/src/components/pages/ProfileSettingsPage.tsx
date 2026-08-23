import UserManager from '@client/stores/UserManager';
import BottomNav from '../BottomNav';
import React from 'react';
import { useNavigate } from 'react-router';

export default function ProfileSettingsPage() {
    const nav = useNavigate();
    const [formData, setFormData] = React.useState({
        email: '',
        firstName: '',
        lastName: ''
    });
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!UserManager.isLoggedIn) {
            nav('/login');
            return;
        }

        const user = UserManager.currentUser;
        setFormData({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        });
    }, [nav]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await UserManager.updateProfile({
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName
            });
            setMessage('Profile updated successfully.');
            setError('');
        } catch {
            setError('Unable to update profile.');
            setMessage('');
        }
    };

    return (
        <>
            <main className="center-section">
                <section className="auth-form-container">
                    <div className="auth-header">
                        <button className="back-button" onClick={() => nav('/')}>
                            ← Back to Home
                        </button>
                        <h1>Profile Settings</h1>
                        <p>Update your account information</p>
                    </div>
                <form onSubmit={handleSubmit} className="auth-form">
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
                    {message && <p className="success-message">{message}</p>}
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="button primary auth-submit">Update Profile</button>
                </form>
                <div className="profile-info">
                    <div className="info-item">
                        <span className="info-label">Instrument:</span>
                        <span className="info-value">{UserManager.currentUser.instrument}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Username:</span>
                        <span className="info-value">{UserManager.currentUser.username}</span>
                    </div>
                </div>
            </section>
        </main>
        <BottomNav />
    </>
    );
}