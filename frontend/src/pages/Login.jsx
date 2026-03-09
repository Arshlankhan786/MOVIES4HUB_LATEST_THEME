import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <h1 className="auth-card__title">Welcome Back</h1>
                    <p className="auth-card__subtitle">Sign in to your Movies4Hub account</p>
                </div>

                {error && <div className="auth-card__error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-form__group">
                        <label className="auth-form__label">Email</label>
                        <input
                            type="email"
                            className="auth-form__input"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            id="login-email"
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Password</label>
                        <input
                            type="password"
                            className="auth-form__input"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            id="login-password"
                        />
                    </div>

                    <button type="submit" className="auth-form__btn" disabled={loading} id="login-submit">
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-card__footer">
                    Don't have an account? <Link to="/register" className="auth-card__link">Sign Up</Link>
                </p>
            </div>
        </div>
    );
}
