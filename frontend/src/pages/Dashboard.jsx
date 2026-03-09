import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import './Dashboard.css';

export default function Dashboard() {
    const { user } = useAuth();
    const { theme } = useTheme();

    if (!user) return null;

    const isPremiumActive = user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > new Date();

    return (
        <div className="dashboard">
            <div className="dashboard__container">
                <div className="dashboard__header">
                    <div className="dashboard__avatar">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h1 className="dashboard__name">{user.username}</h1>
                        <p className="dashboard__email">{user.email}</p>
                    </div>
                </div>

                <div className="dashboard__cards">
                    <div className="dashboard__card">
                        <h3 className="dashboard__card-title">Account Status</h3>
                        <div className="dashboard__card-body">
                            <div className="dashboard__stat">
                                <span className="dashboard__label">Role</span>
                                <span className="dashboard__value dashboard__value--badge">{user.role?.replace('_', ' ')}</span>
                            </div>
                            <div className="dashboard__stat">
                                <span className="dashboard__label">Status</span>
                                <span className={`dashboard__value ${user.isBanned ? 'dashboard__value--danger' : 'dashboard__value--success'}`}>
                                    {user.isBanned ? 'Suspended' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard__card">
                        <h3 className="dashboard__card-title">Premium</h3>
                        <div className="dashboard__card-body">
                            <div className="dashboard__stat">
                                <span className="dashboard__label">Plan</span>
                                <span className={`dashboard__value ${isPremiumActive ? 'dashboard__value--success' : ''}`}>
                                    {isPremiumActive ? '⭐ Premium Active' : 'Free Plan'}
                                </span>
                            </div>
                            {isPremiumActive && (
                                <div className="dashboard__stat">
                                    <span className="dashboard__label">Expires</span>
                                    <span className="dashboard__value">
                                        {new Date(user.premiumExpiry).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            {!isPremiumActive && (
                                <p className="dashboard__hint">Upgrade to premium to remove all ads.</p>
                            )}
                        </div>
                    </div>

                    <div className="dashboard__card">
                        <h3 className="dashboard__card-title">Preferences</h3>
                        <div className="dashboard__card-body">
                            <div className="dashboard__stat">
                                <span className="dashboard__label">Theme</span>
                                <span className="dashboard__value">
                                    {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                                </span>
                            </div>
                            <div className="dashboard__stat">
                                <span className="dashboard__label">Member Since</span>
                                <span className="dashboard__value">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
