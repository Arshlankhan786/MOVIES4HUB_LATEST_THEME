import { useState, useCallback, useEffect } from 'react';
import watchlistService from '../services/watchlistService';

export default function useWatchlist(contentId, type) {
    const [inWatchlist, setInWatchlist] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!contentId || !type) return;
        let cancelled = false;

        watchlistService.getStatus(type, contentId).then(result => {
            if (!cancelled) setInWatchlist(result.inWatchlist);
        });

        return () => { cancelled = true; };
    }, [contentId, type]);

    const toggle = useCallback(async () => {
        if (!contentId || !type || loading) return;
        setLoading(true);
        try {
            let result;
            if (inWatchlist) {
                result = await watchlistService.remove(contentId, type);
                if (result.action === 'removed') setInWatchlist(false);
            } else {
                result = await watchlistService.add(contentId, type);
                if (result.action === 'added') setInWatchlist(true);
            }
        } finally {
            setLoading(false);
        }
    }, [contentId, type, loading, inWatchlist]);

    return { inWatchlist, toggle, loading };
}
