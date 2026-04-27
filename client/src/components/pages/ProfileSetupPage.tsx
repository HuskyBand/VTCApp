import UserManager from '@client/stores/UserManager';
import React from 'react';
import { useNavigate } from 'react-router';

export default function ProfileSetupPage() {
    const nav = useNavigate();
    const [formData, setFormData] = React.useState({
        email: '',
        firstName: '',
        lastName: '',
        instrument: ''
    });
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
            lastName: user.lastName,
            instrument: user.instrument
        });
    }, []);

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
                lastName: formData.lastName,
                instrument: formData.instrument
            });
            nav('/profile');
        } catch (err) {
            setError('Unable to save profile.');
        }
    };

    return (
        <>
            <h1>Complete Profile</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email:</label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div>
                    <label>First Name:</label>
                    <input name="firstName" type="text" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div>
                    <label>Last Name:</label>
                    <input name="lastName" type="text" value={formData.lastName} onChange={handleChange} required />
                </div>
                <div>
                    <label>Instrument:</label>
                    <input name="instrument" type="text" value={formData.instrument} onChange={handleChange} required />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Save Profile</button>
            </form>
        </>
    );
}