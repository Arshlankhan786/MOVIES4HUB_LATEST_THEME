import { useEffect, useState } from 'react';
import './AdBanner.css';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Skip ad loading entirely when backend is on localhost and likely not running
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const IS_LOCAL = BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1');

export default function AdBanner({ placement }) {
    const { user } = useAuth();
    const [ads, setAds] = useState([]);

    useEffect(() => {
        // Skip ads for premium users or localhost dev environment
        if (user?.isPremium || IS_LOCAL) return;

        const controller = new AbortController();

        api.get(`/ads?placement=${placement}`, { signal: controller.signal })
            .then((res) => setAds(res.data?.data || []))
            .catch(() => { /* silently ignore */ });

        return () => controller.abort();
    }, [placement, user]);

    if (user?.isPremium || ads.length === 0) return null;

    return (
        <div className="ad-banner" data-placement={placement}>
            {ads.map((ad) => (
                <div key={ad.id} className="ad-banner__item">
                    {(ad.type === 'banner' || ad.type === 'script') && (
                        <div dangerouslySetInnerHTML={{ __html: ad.code }} />
                    )}
                </div>
            ))}
        </div>
    );
}
