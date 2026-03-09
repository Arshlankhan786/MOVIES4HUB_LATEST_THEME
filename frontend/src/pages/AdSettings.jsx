import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import adminService from '../services/adminService';
import SEOHead from '../components/SEOHead';
import './AdSettings.css';

export default function AdSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        adminService.getAdSettings()
            .then(data => { if (data) setSettings(data); })
            .finally(() => setLoading(false));
    }, []);

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        const result = await adminService.updateAdSettings(settings);
        if (result?.error) {
            setMessage(`Error: ${result.error}`);
        } else {
            setSettings(result);
            setMessage('Settings saved successfully!');
        }
        setSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const isAdmin = user?.role === 'super_admin';

    if (!isAdmin) {
        return (
            <div className="adsettings-page">
                <div className="adsettings-container">
                    <h1>Access Denied</h1>
                    <p>Super admin access required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="adsettings-page">
            <SEOHead title="Ad Settings" description="Manage ad revenue settings" />
            <div className="adsettings-container">
                <h1 className="adsettings-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
                    </svg>
                    Ad Revenue Settings
                </h1>

                {loading ? (
                    <div className="adsettings-loading">Loading...</div>
                ) : settings ? (
                    <div className="adsettings-form">
                        <div className="adsettings-group">
                            <label className="adsettings-toggle">
                                <span className="toggle-label">Global Ads Enabled</span>
                                <div className={`toggle-switch ${settings.global_ads_enabled ? 'on' : ''}`} onClick={() => handleToggle('global_ads_enabled')}>
                                    <div className="toggle-knob" />
                                </div>
                            </label>
                            <p className="toggle-hint">Master switch for all ad placements</p>
                        </div>

                        <div className="adsettings-group">
                            <label className="adsettings-toggle">
                                <span className="toggle-label">Pre-roll Ads</span>
                                <div className={`toggle-switch ${settings.enable_preroll ? 'on' : ''}`} onClick={() => handleToggle('enable_preroll')}>
                                    <div className="toggle-knob" />
                                </div>
                            </label>
                            <p className="toggle-hint">Show ads before video playback starts</p>
                        </div>

                        <div className="adsettings-group">
                            <label className="adsettings-toggle">
                                <span className="toggle-label">Mid-roll Ads</span>
                                <div className={`toggle-switch ${settings.enable_midroll ? 'on' : ''}`} onClick={() => handleToggle('enable_midroll')}>
                                    <div className="toggle-knob" />
                                </div>
                            </label>
                            <p className="toggle-hint">Show ads during video playback</p>
                        </div>

                        <div className="adsettings-group">
                            <label className="adsettings-toggle">
                                <span className="toggle-label">Banner Ads</span>
                                <div className={`toggle-switch ${settings.enable_banner ? 'on' : ''}`} onClick={() => handleToggle('enable_banner')}>
                                    <div className="toggle-knob" />
                                </div>
                            </label>
                            <p className="toggle-hint">Show banner ads on pages</p>
                        </div>

                        <div className="adsettings-group">
                            <label className="adsettings-range">
                                <span className="toggle-label">Mid-roll Interval</span>
                                <span className="range-value">{settings.midroll_interval}s</span>
                            </label>
                            <input
                                type="range"
                                min="60"
                                max="900"
                                step="30"
                                value={settings.midroll_interval}
                                onChange={(e) => setSettings(prev => ({ ...prev, midroll_interval: parseInt(e.target.value) }))}
                                className="adsettings-slider"
                            />
                            <p className="toggle-hint">Time between mid-roll ads (seconds)</p>
                        </div>

                        <div className="adsettings-note">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M10 15v4a3 3 0 0 0 6 0v-4" /><path d="M14 5.2A3.5 3.5 0 0 0 7.5 8.5c0 3.5 2 5.5 5.5 7.5 3.5-2 5.5-4 5.5-7.5A3.5 3.5 0 0 0 14 5.2" />
                            </svg>
                            Premium users always bypass all ads regardless of settings.
                        </div>

                        <button
                            className="adsettings-save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>

                        {message && (
                            <div className={`adsettings-message ${message.includes('Error') ? 'error' : 'success'}`}>
                                {message}
                            </div>
                        )}
                    </div>
                ) : (
                    <p>Failed to load settings.</p>
                )}
            </div>
        </div>
    );
}
