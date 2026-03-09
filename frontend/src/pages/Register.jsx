import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await register(form.email, form.password, form.username);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <h1 className="auth-card__title">Create Account</h1>
                    <p className="auth-card__subtitle">Join Movies4Hub for unlimited streaming</p>
                </div>

                {error && <div className="auth-card__error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-form__group">
                        <label className="auth-form__label">Username</label>
                        <input
                            type="text"
                            className="auth-form__input"
                            placeholder="Your username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                            id="register-username"
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Email</label>
                        <input
                            type="email"
                            className="auth-form__input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            id="register-email"
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Password</label>
                        <input
                            type="password"
                            className="auth-form__input"
                            placeholder="Min. 6 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={6}
                            id="register-password"
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Confirm Password</label>
                        <input
                            type="password"
                            className="auth-form__input"
                            placeholder="Repeat password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            required
                            id="register-confirm-password"
                        />
                    </div>

                    <button type="submit" className="auth-form__btn" disabled={loading} id="register-submit">
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-card__footer">
                    Already have an account? <Link to="/login" className="auth-card__link">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
