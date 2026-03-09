/**
 * frontend/pages/Player.jsx
 *
 * BUG FIX applied in this version:
 *  SERVERS array listed MovieBox before MyFlixerZ in the UI even though the
 *  auto-select logic preferred MyFlixerZ and movieService now fetches
 *  MyFlixerZ first. UI now matches the Myflixerz → Moviebox fallback spec.
 *
 *  All player streaming logic is unchanged.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import movieService from '../services/movieService';
import AdBanner     from '../components/AdBanner';
import SEOHead      from '../components/SEOHead';
import './Player.css';

// ── FIXED: MyFlixerZ listed first to match fallback spec ──────────────────
const SERVERS = [
    { id: 'myflixerz', label: 'MyFlixerZ' },
    { id: 'moviebox',  label: 'MovieBox'  },
];

const QUALITY_RANK = { '1080': 1, '720': 2, '480': 3, '360': 4 };

function sortByQuality(sources) {
    return [...sources].sort((a, b) => {
        const ra = QUALITY_RANK[String(a.quality).replace(/[^\d]/g, '')] ?? 99;
        const rb = QUALITY_RANK[String(b.quality).replace(/[^\d]/g, '')] ?? 99;
        return ra - rb;
    });
}

export default function Player() {
    const { id }       = useParams();
    const location     = useLocation();
    const videoRef     = useRef(null);
    const hlsRef       = useRef(null);

    const passedTitle = location.state?.title    || '';
    const tmdbId      = location.state?.tmdbId   || id;
    const mediaType   = location.state?.type     || location.state?.mediaType || 'movie';
    const season      = location.state?.season   || null;
    const episode     = location.state?.episode  || null;

    const [providerData,  setProviderData]  = useState([]);
    const [activeServer,  setActiveServer]  = useState('myflixerz');
    const [activeSource,  setActiveSource]  = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [streamLoading, setStreamLoading] = useState(false);
    const [error,         setError]         = useState('');
    const [playerReady,   setPlayerReady]   = useState(false);

    // ── Fetch all providers on mount ────────────────────────────────────────
    useEffect(() => {
        if (!tmdbId) return;
        setLoading(true);
        setError('');

        const fetchAll = mediaType === 'tv'
            ? movieService.getAllTVSources(tmdbId, season, episode)
            : movieService.getAllMovieSources(tmdbId);

        fetchAll
            .then((results) => {
                if (!results || results.length === 0) {
                    setError('No streaming sources found. Please try again later.');
                    return;
                }

                const normalized = results.map(r => ({
                    ...r,
                    sources: sortByQuality(r.sources || []),
                }));
                setProviderData(normalized);

                // Prefer myflixerz, fall back to first available
                const preferred = normalized.find(r => r.provider === 'myflixerz') || normalized[0];
                setActiveServer(preferred.provider);
                setActiveSource(preferred.sources[0] || null);
            })
            .catch(() => setError('Failed to load streaming sources. Please try again.'))
            .finally(() => setLoading(false));
    }, [tmdbId, mediaType, season, episode]);

    // ── Destroy HLS ─────────────────────────────────────────────────────────
    const destroyHls = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    }, []);

    // ── Load source into <video> ────────────────────────────────────────────
    const loadSource = useCallback((source) => {
        const video = videoRef.current;
        if (!video || !source?.url) return;

        destroyHls();
        setPlayerReady(false);
        setStreamLoading(true);
        video.pause();

        if (source.type === 'hls') {
            import('hls.js').then(({ default: Hls }) => {
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        enableWorker:     true,
                        lowLatencyMode:   false,
                        maxBufferLength:  30,
                        xhrSetup: (xhr) => {
                            if (source.headers) {
                                Object.entries(source.headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
                            }
                        },
                    });
                    hls.loadSource(source.url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        setPlayerReady(true);
                        setStreamLoading(false);
                        video.play().catch(() => {});
                    });
                    hls.on(Hls.Events.ERROR, (_, data) => {
                        if (data.fatal) {
                            setError('HLS stream failed. Try another server.');
                            setStreamLoading(false);
                        }
                    });
                    hlsRef.current = hls;
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = source.url;
                    setPlayerReady(true);
                    setStreamLoading(false);
                    video.play().catch(() => {});
                } else {
                    setError('HLS is not supported in this browser.');
                    setStreamLoading(false);
                }
            }).catch(() => {
                video.src = source.url;
                setPlayerReady(true);
                setStreamLoading(false);
            });
        } else {
            video.src = source.url;
            setPlayerReady(true);
            setStreamLoading(false);
            video.play().catch(() => {});
        }
    }, [destroyHls]);

    useEffect(() => {
        if (activeSource) loadSource(activeSource);
        return destroyHls;
    }, [activeSource]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Subtitle tracks ─────────────────────────────────────────────────────
    useEffect(() => {
        const video   = videoRef.current;
        const current = providerData.find(p => p.provider === activeServer);
        const subs    = current?.data?.subtitles || current?.data?.data?.subtitles || [];
        if (!subs.length || !video) return;
        while (video.firstChild?.tagName === 'TRACK') video.removeChild(video.firstChild);
        subs.forEach((sub, i) => {
            const track    = document.createElement('track');
            track.kind     = 'subtitles';
            track.src      = sub.url || sub.file;
            track.srclang  = sub.lang || 'en';
            track.label    = sub.label || sub.lang || `Subtitle ${i + 1}`;
            if (i === 0) track.default = true;
            video.appendChild(track);
        });
    }, [activeServer, providerData]);

    // ── Server switch ────────────────────────────────────────────────────────
    function handleServerSwitch(serverId) {
        if (serverId === activeServer) return;
        const target = providerData.find(p => p.provider === serverId);
        if (!target?.sources?.length) {
            setError(`No sources available from ${serverId}.`);
            return;
        }
        setError('');
        setActiveServer(serverId);
        setActiveSource(target.sources[0]);
    }

    // ── Quality switch ───────────────────────────────────────────────────────
    function handleQualitySwitch(source) {
        if (source.url !== activeSource?.url) setActiveSource(source);
    }

    const currentSources = providerData.find(p => p.provider === activeServer)?.sources || [];
    const title          = passedTitle || `Stream ${tmdbId}`;

    if (loading) {
        return (
            <div className="player-page">
                <div className="page-loader">
                    <div className="page-loader__spinner" />
                    <p>Loading player…</p>
                </div>
            </div>
        );
    }

    if (error && providerData.length === 0) {
        return (
            <div className="player-page">
                <div className="player-error">
                    <h2>Playback Error</h2>
                    <p>{error}</p>
                    <Link to="/" className="player-error__home">← Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="player-page">
            <SEOHead title={`Watch ${title}`} description={`Now playing: ${title}`} />
            <AdBanner placement="player_top" />

            <div className="player-container">
                {/* Video */}
                <div className="player-wrapper">
                    <video
                        ref={videoRef}
                        className="player-video"
                        controls
                        autoPlay
                        playsInline
                        crossOrigin="anonymous"
                        id="video-player"
                    />

                    {(streamLoading || !playerReady) && !error && activeSource && (
                        <div className="player-loading-overlay">
                            <div className="page-loader__spinner" />
                            <p>Buffering…</p>
                        </div>
                    )}

                    {error && activeSource && (
                        <div className="player-loading-overlay player-loading-overlay--error">
                            <span style={{ fontSize: 32 }}>⚠</span>
                            <p>{error}</p>
                            <button
                                className="player-retry-btn"
                                onClick={() => { setError(''); loadSource(activeSource); }}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>

                {/* Server + Quality selectors */}
                <div className="player-servers">
                    <div className="player-servers__group">
                        <span className="player-servers__label">Server</span>
                        <div className="player-servers__list">
                            {SERVERS.map((srv) => {
                                const hasData = providerData.some(
                                    p => p.provider === srv.id && p.sources.length > 0
                                );
                                return (
                                    <button
                                        key={srv.id}
                                        className={[
                                            'player-servers__btn',
                                            activeServer === srv.id ? 'player-servers__btn--active' : '',
                                            !hasData ? 'player-servers__btn--disabled' : '',
                                        ].join(' ').trim()}
                                        onClick={() => handleServerSwitch(srv.id)}
                                        disabled={!hasData}
                                    >
                                        {srv.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {currentSources.length > 1 && (
                        <div className="player-servers__group">
                            <span className="player-servers__label">Quality</span>
                            <div className="player-servers__list">
                                {currentSources.map((src, i) => (
                                    <button
                                        key={i}
                                        className={[
                                            'player-servers__btn player-servers__btn--quality',
                                            activeSource?.url === src.url ? 'player-servers__btn--active' : '',
                                        ].join(' ').trim()}
                                        onClick={() => handleQualitySwitch(src)}
                                    >
                                        {src.quality}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="player-info">
                <h1 className="player-info__title">{title}</h1>
                <div className="player-info__meta">
                    {activeServer          && <span className="player-info__tag">{activeServer.toUpperCase()}</span>}
                    {activeSource?.quality && <span className="player-info__tag">{activeSource.quality}</span>}
                    {activeSource?.type    && <span className="player-info__tag">{activeSource.type.toUpperCase()}</span>}
                </div>
            </div>

            <AdBanner placement="player_bottom" />
        </div>
    );
}