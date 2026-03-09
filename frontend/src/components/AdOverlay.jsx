import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './AdOverlay.css';

const IS_LOCAL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').includes('localhost');

function AdOverlayInner({ placement, onComplete, onSkip, isPremium }) {
    const [ad, setAd] = useState(null);
    const [countdown, setCountdown] = useState(5);
    const [canSkip, setCanSkip] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isPremium || IS_LOCAL) {
            onComplete?.();
            return;
        }

        api.get(`/ads?placement=${placement}`)
            .then((res) => {
                const ads = res.data?.data;
                if (ads?.length > 0) {
                    setAd(ads[0]);
                } else {
                    onComplete?.();
                }
            })
            .catch(() => onComplete?.());
    }, [placement, isPremium, onComplete]);

    useEffect(() => {
        if (!ad) return;
        timerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setCanSkip(true);
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [ad]);

    if (!ad) return null;

    return (
        <div className="ad-overlay">
            <div className="ad-overlay__backdrop" />
            <div className="ad-overlay__content">
                <div className="ad-overlay__label">Advertisement</div>
                <div
                    className="ad-overlay__body"
                    dangerouslySetInnerHTML={{ __html: ad.code }}
                />
                {canSkip ? (
                    <button
                        className="ad-overlay__skip"
                        onClick={() => { onSkip?.(); onComplete?.(); }}
                    >
                        Skip Ad →
                    </button>
                ) : (
                    <div className="ad-overlay__countdown">
                        Skip in {countdown}s
                    </div>
                )}
            </div>
        </div>
    );
}

export const PrerollAd = memo(function PrerollAd({ onComplete }) {
    const { user } = useAuth();
    return (
        <AdOverlayInner
            placement="preroll"
            onComplete={onComplete}
            isPremium={user?.isPremium}
        />
    );
});

export const MidrollAd = memo(function MidrollAd({ onComplete, onSkip }) {
    const { user } = useAuth();
    return (
        <AdOverlayInner
            placement="midroll"
            onComplete={onComplete}
            onSkip={onSkip}
            isPremium={user?.isPremium}
        />
    );
});

export function BannerOverlay() {
    const { user } = useAuth();
    const [ad, setAd] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (user?.isPremium || IS_LOCAL) return;
        api.get('/ads?placement=overlay')
            .then((res) => {
                const ads = res.data?.data;
                if (ads?.length > 0) setAd(ads[0]);
            })
            .catch(() => { });
    }, [user]);

    if (!ad || dismissed || user?.isPremium) return null;

    return (
        <div className="banner-overlay">
            <button className="banner-overlay__close" onClick={() => setDismissed(true)}>✕</button>
            <div dangerouslySetInnerHTML={{ __html: ad.code }} />
        </div>
    );
}

export function useMidrollTrigger(isPremium) {
    const [showMidroll, setShowMidroll] = useState(false);
    const intervalRef = useRef(null);
    const triggeredAt = useRef(new Set());

    const start = useCallback(() => {
        if (isPremium) return;
        intervalRef.current = setInterval(() => {
            const now = Math.floor(Date.now() / 60000);
            if (!triggeredAt.current.has(now)) {
                triggeredAt.current.add(now);
                setShowMidroll(true);
            }
        }, 20 * 60 * 1000);
    }, [isPremium]);

    const dismiss = useCallback(() => {
        setShowMidroll(false);
    }, []);

    const cleanup = useCallback(() => {
        clearInterval(intervalRef.current);
    }, []);

    useEffect(() => () => clearInterval(intervalRef.current), []);

    return { showMidroll, startMidroll: start, dismissMidroll: dismiss, cleanupMidroll: cleanup };
}
