import { useRef, useCallback, useEffect } from 'react';
import watchHistoryApi from '../services/watchHistoryApi';

export default function useWatchProgress(episodeId, contentId, user) {
    const lastSaved = useRef(0);
    const timerRef = useRef(null);
    const progressRef = useRef(0);
    const durationRef = useRef(0);

    const save = useCallback(() => {
        if (!user || !episodeId) return;
        const now = Date.now();
        if (now - lastSaved.current < 8000) return;
        lastSaved.current = now;
        watchHistoryApi.saveProgress({
            contentId: contentId || episodeId,
            episodeId,
            progress: progressRef.current,
            duration: durationRef.current,
        });
    }, [user, episodeId, contentId]);

    const updateProgress = useCallback((currentTime, totalDuration) => {
        progressRef.current = Math.floor(currentTime);
        durationRef.current = Math.floor(totalDuration);
    }, []);

    useEffect(() => {
        if (!user || !episodeId) return;
        timerRef.current = setInterval(save, 10000);
        return () => {
            clearInterval(timerRef.current);
            save();
        };
    }, [save, user, episodeId]);

    return { updateProgress, saveNow: save };
}
