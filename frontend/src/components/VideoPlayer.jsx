/*
 * Movies4Hub Streaming Platform
 * Created by Pathan Arshlan
 * GitHub: https://github.com/Arshlankhan786
 * Copyright © Pathan Arshlan. Removing credits or copyright may result in legal action.
 *
 * frontend/components/VideoPlayer.jsx
 *
 * OTT-grade player supporting HLS (.m3u8), MP4, and iframe embeds.
 *
 * NEW in this version:
 *  ─ Tap zones: left 30% rewind | center play/pause | right 30% forward
 *  ─ Single tap  → show/hide controls (+ center zone toggles play)
 *  ─ Double tap  → seek ±10s with ⏪/⏩ flash animation
 *  ─ Drag-to-seek progress bar (smooth scrubbing on desktop + mobile)
 *  ─ Rewind/Forward 10s buttons in control bar
 *  ─ Improved buffering ring (Netflix-style)
 *  ─ Seek flash animation overlay
 *  ─ All existing features preserved (PiP, speed, subtitles, HLS, MP4, fullscreen)
 *  ─ Fixed: hooks were declared after early `embedUrl` return — moved return after hooks
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import './VideoPlayer.css';

const SPEEDS       = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_SECONDS = 10;
const DBL_TAP_MS   = 260; // max ms between taps to count as double-tap

function formatTime(sec) {
    if (!sec || !isFinite(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * VideoPlayer — OTT-grade player supporting HLS (.m3u8), MP4, and iframe embeds.
 *
 * Props:
 *   src          – Stream URL (.m3u8 or .mp4)
 *   embedUrl     – Iframe embed URL (anime servers)
 *   subtitles    – [{ url, lang, label }]
 *   poster       – Poster image URL
 *   onError      – (errorMsg: string) => void
 *   onReady      – () => void
 *   onEnded      – () => void
 *   autoPlay     – boolean (default true)
 *   title        – string
 */
function VideoPlayer({
    src,
    embedUrl,
    subtitles = [],
    poster,
    onError,
    onReady,
    onEnded,
    autoPlay = true,
    title,
}) {
    // ─── Refs ────────────────────────────────────────────────────────────────
    const containerRef       = useRef(null);
    const videoRef           = useRef(null);
    const hlsRef             = useRef(null);
    const controlsTimer      = useRef(null);
    // Tap-zone gesture tracking
    const tapCountRef        = useRef(0);
    const tapTimerRef        = useRef(null);
    const seekFlashTimer     = useRef(null);
    // Progress drag
    const progressDragging   = useRef(false);
    const progressElRef      = useRef(null);

    // ─── State ───────────────────────────────────────────────────────────────
    const [playing,        setPlaying]        = useState(false);
    const [currentTime,    setCurrentTime]    = useState(0);
    const [duration,       setDuration]       = useState(0);
    const [buffered,       setBuffered]        = useState(0);
    const [volume,         setVolume]         = useState(1);
    const [muted,          setMuted]          = useState(false);
    const [speed,          setSpeed]          = useState(1);
    const [showSpeedMenu,  setShowSpeedMenu]  = useState(false);
    const [isFullscreen,   setIsFullscreen]   = useState(false);
    const [loading,        setLoading]        = useState(true);
    const [buffering,      setBuffering]      = useState(false);
    const [error,          setError]          = useState('');
    const [controlsVisible,setControlsVisible]= useState(true);
    // Seek flash: null | { dir: 'left'|'right' }
    const [seekFlash,      setSeekFlash]      = useState(null);
    // Brief "play-pulse" shown at center when play is triggered via tap
    const [playPulse,      setPlayPulse]      = useState(false);

    // ─── Cleanup on unmount ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
            clearTimeout(controlsTimer.current);
            clearTimeout(tapTimerRef.current);
            clearTimeout(seekFlashTimer.current);
            // Remove drag listeners if mounted
            document.removeEventListener('mousemove', handleProgressMouseMove);
            document.removeEventListener('mouseup',   handleProgressMouseUp);
            document.removeEventListener('touchmove', handleProgressTouchMove);
            document.removeEventListener('touchend',  handleProgressTouchEnd);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Load source ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!src) { setLoading(false); return; }
        const video = videoRef.current;
        if (!video) return;

        setLoading(true);
        setError('');
        setBuffering(false);
        setCurrentTime(0);

        // Destroy any existing HLS instance
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

        // Fix Railway double-slash
        const fixedSrc = src.replace(
            'https://movies4hub-movie-api-production.up.railway.app//',
            'https://movies4hub-movie-api-production.up.railway.app/'
        );

        const isHLS = fixedSrc.includes('.m3u8') || fixedSrc.includes('m3u8-proxy');

        if (isHLS) {
            import('hls.js').then(({ default: Hls }) => {
                if (!videoRef.current) return;
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        enableWorker:     true,
                        lowLatencyMode:   false,
                        maxBufferLength:  30,
                        maxMaxBufferLength: 60,
                        startLevel:       -1,
                        xhrSetup: (xhr)  => { xhr.withCredentials = false; },
                    });
                    hlsRef.current = hls;
                    hls.loadSource(fixedSrc);
                    hls.attachMedia(video);

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        setLoading(false);
                        onReady?.();
                        if (autoPlay) video.play().catch(() => {});
                    });

                    hls.on(Hls.Events.ERROR, (_, data) => {
                        if (data.fatal) {
                            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                hls.startLoad(); // attempt recovery
                            } else {
                                setError('Stream playback failed');
                                setLoading(false);
                                onError?.('Stream playback failed');
                            }
                        }
                    });

                    hls.on(Hls.Events.FRAG_BUFFERED, () => setBuffering(false));

                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // Native HLS (Safari / iOS)
                    video.src = fixedSrc;
                    video.addEventListener('loadedmetadata', () => {
                        setLoading(false);
                        onReady?.();
                        if (autoPlay) video.play().catch(() => {});
                    }, { once: true });
                } else {
                    setError('HLS not supported in this browser');
                    setLoading(false);
                }
            }).catch(() => {
                setError('Failed to initialise HLS player');
                setLoading(false);
            });
        } else {
            // Direct MP4 / other format
            video.src = fixedSrc;
            const onLoaded = () => {
                setLoading(false);
                onReady?.();
                if (autoPlay) video.play().catch(() => {});
            };
            const onErr = () => {
                setError('Failed to load video');
                setLoading(false);
                onError?.('Failed to load video');
            };
            video.addEventListener('loadeddata', onLoaded, { once: true });
            video.addEventListener('error',      onErr,    { once: true });
            return () => {
                video.removeEventListener('loadeddata', onLoaded);
                video.removeEventListener('error',      onErr);
            };
        }
    }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Subtitles ───────────────────────────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.querySelectorAll('track').forEach(t => t.remove());
        subtitles.forEach((sub, i) => {
            const track    = document.createElement('track');
            track.kind     = 'subtitles';
            track.src      = sub.url || sub.file || '';
            track.srclang  = sub.lang || 'en';
            track.label    = sub.label || sub.lang || `Sub ${i + 1}`;
            if (i === 0) track.default = true;
            video.appendChild(track);
        });
    }, [subtitles, src]);

    // ─── Fullscreen listener ─────────────────────────────────────────────────
    useEffect(() => {
        const cb = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', cb);
        return () => document.removeEventListener('fullscreenchange', cb);
    }, []);

    // ─── Video event handlers ────────────────────────────────────────────────
    const handleTimeUpdate = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        setCurrentTime(v.currentTime);
        setDuration(v.duration || 0);
        if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    }, []);

    const handleWaiting = useCallback(() => setBuffering(true),  []);
    const handlePlaying = useCallback(() => setBuffering(false), []);
    const handlePlay    = useCallback(() => setPlaying(true),    []);
    const handlePause   = useCallback(() => { setPlaying(false); setControlsVisible(true); }, []);
    const handleEnd     = useCallback(() => { setPlaying(false); onEnded?.(); }, [onEnded]);

    // ─── Controls auto-hide ──────────────────────────────────────────────────
    const showControls = useCallback(() => {
        setControlsVisible(true);
        clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setControlsVisible(false);
                setShowSpeedMenu(false);
            }
        }, 3500);
    }, []);

    // ─── Core player actions ─────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v || !src) return;
        if (v.paused) {
            v.play().catch(() => {});
            // Show brief play-pulse at center
            setPlayPulse(true);
            setTimeout(() => setPlayPulse(false), 500);
        } else {
            v.pause();
        }
    }, [src]);

    const toggleMute = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
    }, []);

    const handleVolumeChange = useCallback((e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setMuted(val === 0);
        if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
    }, []);

    const changeSpeed = useCallback((s) => {
        setSpeed(s);
        setShowSpeedMenu(false);
        if (videoRef.current) videoRef.current.playbackRate = s;
    }, []);

    const toggleFullscreen = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
        } else {
            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        }
    }, []);

    const togglePiP = useCallback(async () => {
        const v = videoRef.current;
        if (!v) return;
        try {
            if (document.pictureInPictureElement) await document.exitPictureInPicture();
            else await v.requestPictureInPicture();
        } catch { /* PiP not supported */ }
    }, []);

    // ─── Seek helper ─────────────────────────────────────────────────────────
    const triggerSeekFlash = useCallback((dir) => {
        const v = videoRef.current;
        if (!v) return;
        const delta = dir === 'left' ? -SEEK_SECONDS : SEEK_SECONDS;
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
        setSeekFlash({ dir });
        clearTimeout(seekFlashTimer.current);
        seekFlashTimer.current = setTimeout(() => setSeekFlash(null), 750);
        showControls();
    }, [showControls]);

    // ─── Progress bar — mouse drag ────────────────────────────────────────────
    const getProgressPct = (clientX) => {
        const el = progressElRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const handleProgressMouseMove = useCallback((e) => {
        if (!progressDragging.current) return;
        const v = videoRef.current;
        if (v && v.duration) v.currentTime = getProgressPct(e.clientX) * v.duration;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleProgressMouseUp = useCallback(() => {
        progressDragging.current = false;
        document.removeEventListener('mousemove', handleProgressMouseMove);
        document.removeEventListener('mouseup',   handleProgressMouseUp);
    }, [handleProgressMouseMove]);

    const handleProgressMouseDown = useCallback((e) => {
        e.stopPropagation();
        const v = videoRef.current;
        if (!v || !duration) return;
        progressDragging.current = true;
        v.currentTime = getProgressPct(e.clientX) * duration;
        document.addEventListener('mousemove', handleProgressMouseMove);
        document.addEventListener('mouseup',   handleProgressMouseUp);
    }, [duration, handleProgressMouseMove, handleProgressMouseUp]);

    // Progress bar — touch drag (mobile scrubbing)
    const handleProgressTouchMove = useCallback((e) => {
        if (!progressDragging.current) return;
        const v = videoRef.current;
        if (v && v.duration) v.currentTime = getProgressPct(e.touches[0].clientX) * v.duration;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleProgressTouchEnd = useCallback(() => {
        progressDragging.current = false;
        document.removeEventListener('touchmove', handleProgressTouchMove);
        document.removeEventListener('touchend',  handleProgressTouchEnd);
    }, [handleProgressTouchMove]);

    const handleProgressTouchStart = useCallback((e) => {
        e.stopPropagation();
        const v = videoRef.current;
        if (!v || !duration) return;
        progressDragging.current = true;
        v.currentTime = getProgressPct(e.touches[0].clientX) * duration;
        document.addEventListener('touchmove', handleProgressTouchMove, { passive: true });
        document.addEventListener('touchend',  handleProgressTouchEnd);
    }, [duration, handleProgressTouchMove, handleProgressTouchEnd]);

    // ─── Unified tap-zone handler ─────────────────────────────────────────────
    // Single tap  → show/hide controls (center zone also toggles play)
    // Double tap  → left → rewind 10s | center → fullscreen | right → fwd 10s
    const handlePlayerClick = useCallback((e) => {
        // Don't intercept clicks on actual control elements
        if (
            e.target.closest('.video-player__controls')    ||
            e.target.closest('.video-player__center-play') ||
            e.target.closest('.video-player__title-bar')   ||
            e.target.closest('.video-player__error')       ||
            e.target.closest('.video-player__loader')
        ) return;

        if (!src) { showControls(); return; }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = (e.clientX - rect.left) / rect.width;

        tapCountRef.current += 1;

        if (tapCountRef.current === 1) {
            // Start timer — if no second tap arrives, treat as single tap
            tapTimerRef.current = setTimeout(() => {
                tapCountRef.current = 0;
                // Single tap: show/hide controls
                if (controlsVisible) {
                    setControlsVisible(false);
                    clearTimeout(controlsTimer.current);
                } else {
                    showControls();
                }
                // Centre zone also toggles play on single tap
                if (relX >= 0.3 && relX <= 0.7) {
                    togglePlay();
                }
            }, DBL_TAP_MS);
        } else {
            // Double tap detected
            clearTimeout(tapTimerRef.current);
            tapCountRef.current = 0;
            if (relX < 0.3) {
                triggerSeekFlash('left');
            } else if (relX > 0.7) {
                triggerSeekFlash('right');
            } else {
                toggleFullscreen();
            }
        }
    }, [src, controlsVisible, showControls, togglePlay, toggleFullscreen, triggerSeekFlash]);

    // ─── Derived values ───────────────────────────────────────────────────────
    const progress    = duration ? (currentTime / duration) * 100 : 0;
    const bufferedPct = duration ? (buffered    / duration) * 100 : 0;

    // ════════════════════════════════════════════════════════════════════════
    // EMBED (anime iframe) — rendered after all hooks
    // ════════════════════════════════════════════════════════════════════════
    if (embedUrl) {
        return (
            <div className="video-player" ref={containerRef}>
                <iframe
                    className="video-player__embed"
                    src={embedUrl}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                    referrerPolicy="no-referrer"
                    title={title || 'Player'}
                    onLoad={() => {
                        const iframe = document.querySelector('.video-player__embed');
                        iframe?.contentWindow?.focus();
                    }}
                />
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // MAIN PLAYER
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div
            className={[
                'video-player',
                !playing            ? 'video-player--paused'   : '',
                controlsVisible     ? 'video-player--controls-visible' : '',
            ].join(' ')}
            ref={containerRef}
            onMouseMove={showControls}
            onMouseLeave={() => { if (!videoRef.current?.paused) setControlsVisible(false); }}
            onClick={handlePlayerClick}
        >
            {/* ── Deep gradient overlay — bottom + top vignette ── */}
            <div className="video-player__gradient" />

            {/* ── Top title bar ── */}
            {title && (
                <div className="video-player__title-bar">
                    <span className="video-player__title">{title}</span>
                </div>
            )}

            {/* ── Video element (click handled by container overlay) ── */}
            <video
                ref={videoRef}
                className="video-player__video"
                poster={poster}
                crossOrigin="anonymous"
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnd}
                onWaiting={handleWaiting}
                onPlaying={handlePlaying}
            />

            {/* ── Tap zone hint labels (appear briefly on first interact) ── */}
            <div className="vp-zones" aria-hidden="true">
                <div className="vp-zone vp-zone--left"  />
                <div className="vp-zone vp-zone--center"/>
                <div className="vp-zone vp-zone--right" />
            </div>

            {/* ── Seek flash animation overlay ── */}
            {seekFlash && (
                <div className={`vp-seek-flash vp-seek-flash--${seekFlash.dir}`} aria-hidden="true">
                    <span className="vp-seek-flash__icon">
                        {seekFlash.dir === 'left' ? '⏪' : '⏩'}
                    </span>
                    <span className="vp-seek-flash__label">{SEEK_SECONDS}s</span>
                </div>
            )}

            {/* ── Play-pulse feedback (brief, centre, on tap-to-play) ── */}
            {playPulse && (
                <div className="vp-play-pulse" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                </div>
            )}

            {/* ── Centre play/pause button (large, OTT-style) ── */}
            {!loading && !error && src && (
                <button
                    className={`video-player__center-play ${!playing ? 'video-player__center-play--visible' : ''}`}
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    aria-label={playing ? 'Pause' : 'Play'}
                >
                    {playing ? (
                        <svg viewBox="0 0 24 24">
                            <rect x="6"  y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                    )}
                </button>
            )}

            {/* ── Loading overlay ── */}
            {loading && (
                <div className="video-player__loader">
                    <div className="video-player__spinner" />
                    <span className="video-player__loader-text">Loading stream…</span>
                </div>
            )}

            {/* ── Mid-playback buffering ring (Netflix-style) ── */}
            {buffering && !loading && (
                <div className="video-player__buffering">
                    <div className="video-player__buffering-ring" />
                    <div className="video-player__buffering-ring video-player__buffering-ring--delay" />
                </div>
            )}

            {/* ── Error overlay ── */}
            {error && (
                <div className="video-player__error">
                    <span className="video-player__error-icon">⚠️</span>
                    <p className="video-player__error-msg">{error}</p>
                    <button
                        className="video-player__error-retry"
                        onClick={(e) => {
                            e.stopPropagation();
                            setError('');
                            setLoading(true);
                            const v = videoRef.current;
                            if (v && src) {
                                if (hlsRef.current) { hlsRef.current.startLoad(); setLoading(false); }
                                else { v.load(); }
                            }
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                Controls bar
            ══════════════════════════════════════════════════════════════ */}
            <div
                className="video-player__controls"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Progress / scrubber bar (drag-enabled) ── */}
                <div
                    ref={progressElRef}
                    className="video-player__progress"
                    onMouseDown={handleProgressMouseDown}
                    onTouchStart={handleProgressTouchStart}
                    role="slider"
                    aria-label="Video progress"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    {/* Track bg */}
                    <div className="video-player__progress-track">
                        {/* Buffered */}
                        <div
                            className="video-player__progress-buffered"
                            style={{ width: `${bufferedPct}%` }}
                        />
                        {/* Played */}
                        <div
                            className="video-player__progress-filled"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Thumb knob */}
                        <div
                            className="video-player__progress-thumb"
                            style={{ left: `${progress}%` }}
                        />
                    </div>
                    {/* Time tooltip (optional) */}
                    <span className="video-player__progress-time" style={{ left: `${progress}%` }}>
                        {formatTime(currentTime)}
                    </span>
                </div>

                {/* ── Bottom control row ── */}
                <div className="video-player__controls-row">

                    {/* LEFT cluster */}
                    <div className="video-player__controls-left">

                        {/* Play / Pause */}
                        <button
                            className="video-player__btn"
                            onClick={togglePlay}
                            title={playing ? 'Pause' : 'Play'}
                            aria-label={playing ? 'Pause' : 'Play'}
                        >
                            {playing ? (
                                <svg viewBox="0 0 24 24">
                                    <rect x="6"  y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                            )}
                        </button>

                        {/* Rewind 10s */}
                        <button
                            className="video-player__btn video-player__btn--seek"
                            onClick={() => triggerSeekFlash('left')}
                            title="Rewind 10s"
                            aria-label="Rewind 10 seconds"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1,4 1,10 7,10" />
                                <path d="M3.51 15a9 9 0 1 0 .49-3.76" />
                                <text x="12" y="13.5" textAnchor="middle" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="700" fontFamily="sans-serif">10</text>
                            </svg>
                        </button>

                        {/* Forward 10s */}
                        <button
                            className="video-player__btn video-player__btn--seek"
                            onClick={() => triggerSeekFlash('right')}
                            title="Forward 10s"
                            aria-label="Forward 10 seconds"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23,4 23,10 17,10" />
                                <path d="M20.49 15a9 9 0 1 1-.49-3.76" />
                                <text x="12" y="13.5" textAnchor="middle" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="700" fontFamily="sans-serif">10</text>
                            </svg>
                        </button>

                        {/* Volume */}
                        <div className="video-player__volume-wrap">
                            <button
                                className="video-player__btn"
                                onClick={toggleMute}
                                title={muted ? 'Unmute' : 'Mute'}
                            >
                                {muted || volume === 0 ? (
                                    <svg viewBox="0 0 24 24">
                                        <path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45A4.22 4.22 0 0 0 16.5 12zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8c1.48-.73 2.5-2.25 2.5-4zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" />
                                    </svg>
                                )}
                            </button>
                            <input
                                type="range"
                                className="video-player__volume-slider"
                                min="0" max="1" step="0.05"
                                value={muted ? 0 : volume}
                                onChange={handleVolumeChange}
                                aria-label="Volume"
                            />
                        </div>

                        {/* Current / total time */}
                        <span className="video-player__time">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* RIGHT cluster */}
                    <div className="video-player__controls-right">

                        {/* Playback speed */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className="video-player__btn"
                                onClick={() => setShowSpeedMenu(p => !p)}
                                title="Playback speed"
                            >
                                {speed !== 1 ? `${speed}×` : (
                                    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                                        <path d="M10 8v8l6-4-6-4zm1.5 2.33L13.83 12l-2.33 1.67v-3.34zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z" />
                                    </svg>
                                )}
                            </button>
                            {showSpeedMenu && (
                                <div className="video-player__popup-menu video-player__popup-menu--speed">
                                    {SPEEDS.map(s => (
                                        <button
                                            key={s}
                                            className={`video-player__popup-option ${s === speed ? 'video-player__popup-option--active' : ''}`}
                                            onClick={() => changeSpeed(s)}
                                        >
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Picture-in-Picture */}
                        <button
                            className="video-player__btn"
                            onClick={togglePiP}
                            title="Picture in Picture"
                        >
                            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                                <path d="M19 11h-8v6h8v-6zm4-8H1v18h22V3zm-2 16H3V5h18v14z" />
                            </svg>
                        </button>

                        {/* Fullscreen */}
                        <button
                            className="video-player__btn"
                            onClick={toggleFullscreen}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? (
                                <svg viewBox="0 0 24 24">
                                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24">
                                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(VideoPlayer);