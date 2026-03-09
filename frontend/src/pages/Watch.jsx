/*
 * Movies4Hub Streaming Platform
 * Created by Pathan Arshlan
 * GitHub: https://github.com/Arshlankhan786
 * Copyright © Pathan Arshlan. Removing credits or copyright may result in legal action.
 *
 * frontend/pages/Watch.jsx
 *
 * CHANGES in this version:
 *  ─ Language selector (between server & quality): "Original Audio | Hindi | French …"
 *  ─ Quality selector: "1080p | 720p | 480p …"
 *  ─ Server selector moved from inside ArtPlayer to Watch.jsx
 *  ─ groupSourcesByLanguage imported from movieService to derive selectors
 *  ─ Stream URL resolved: groupedSources[activeLanguage][activeQuality].url
 *  ─ Stream failover: onError → try next quality → try next server
 *  ─ Passes resolved `src` to VideoPlayer (not ArtPlayer) for movies / TV
 *  ─ Anime flow is UNTOUCHED (iframe via VideoPlayer embedUrl)
 *  ─ "More Like This" recommendation grid PRESERVED
 *  ─ Episode list, seasons, cast, description all PRESERVED
 *  ─ Subtitle extraction fixed (data.subtitles path)
 */

import {
    useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import VideoPlayer      from '../components/VideoPlayer';
import movieService, { groupSourcesByLanguage } from '../services/movieService';
import animeService     from '../services/animeService';
import tmdbService      from '../services/tmdbService';
import './Watch.css';

const TMDB_IMG = 'https://image.tmdb.org/t/p';

// ── Friendly display name for provider id ──────────────────────────────────
function providerLabel(id) {
    if (id === 'myflixerz') return 'MyFlixerZ';
    if (id === 'moviebox')  return 'MovieBox';
    return String(id).charAt(0).toUpperCase() + String(id).slice(1);
}

// ── Extract subtitles from a provider result {provider, sources, data} ─────
function extractSubtitles(providerResult) {
    if (!providerResult) return [];
    const fromData =
        providerResult?.data?.subtitles        ||
        providerResult?.data?.tracks           ||
        providerResult?.data?.data?.subtitles  ||
        [];
    const fromSource = providerResult?.sources?.[0]?.subtitles || [];
    const merged = [...fromData, ...fromSource];
    return Array.isArray(merged) ? merged : [];
}

// ── Quality sort: highest first ────────────────────────────────────────────
const Q_RANK = { '2160': 0, '1080': 1, '720': 2, '480': 3, '360': 4 };
function sortQualitiesDesc(qualities) {
    return [...qualities].sort((a, b) => {
        const ra = Q_RANK[a] ?? 99;
        const rb = Q_RANK[b] ?? 99;
        return ra - rb;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector button — small reusable styled button
// ─────────────────────────────────────────────────────────────────────────────
function SelectorBtn({ active, color = 'red', onClick, children }) {
    const colors = {
        red:   { bg: '#e50914', border: '#e50914', text: '#fff', shadow: 'rgba(229,9,20,0.35)' },
        blue:  { bg: '#1565c0', border: '#42a5f5', text: '#90caf9', shadow: 'rgba(66,165,245,0.3)' },
        green: { bg: '#1b5e20', border: '#66bb6a', text: '#a5d6a7', shadow: 'rgba(102,187,106,0.3)' },
    };
    const c = colors[color] || colors.red;

    return (
        <button
            onClick={onClick}
            style={{
                padding:      '7px 18px',
                background:   active ? c.bg   : 'rgba(255,255,255,0.05)',
                color:        active ? '#fff' : 'rgba(255,255,255,0.62)',
                border:       active ? `1.5px solid ${c.border}` : '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                cursor:       'pointer',
                fontSize:     '0.875rem',
                fontWeight:   active ? '600' : '400',
                transition:   'all 0.2s ease',
                boxShadow:    active ? `0 0 14px ${c.shadow}` : 'none',
                whiteSpace:   'nowrap',
                letterSpacing: active ? '0.2px' : '0',
            }}
        >
            {children}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectorRow — label + buttons
// ─────────────────────────────────────────────────────────────────────────────
function SelectorRow({ label, color, items, activeItem, getLabel, onSelect }) {
    if (!items || items.length === 0) return null;
    return (
        <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            flexWrap:   'wrap',
        }}>
            <span style={{
                color:          'rgba(255,255,255,0.45)',
                fontSize:       '0.75rem',
                textTransform:  'uppercase',
                letterSpacing:  '1.2px',
                fontWeight:     '600',
                minWidth:       '68px',
                flexShrink:     0,
            }}>
                {label}
            </span>
            {items.map(item => (
                <SelectorBtn
                    key={item}
                    active={item === activeItem}
                    color={color}
                    onClick={() => onSelect(item)}
                >
                    {getLabel ? getLabel(item) : item}
                </SelectorBtn>
            ))}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Watch() {
// ═════════════════════════════════════════════════════════════════════════════
    const { episodeId, type: routeType, slug } = useParams();
    const location  = useLocation();
    const navigate  = useNavigate();

    // ── Content type detection ──────────────────────────────────────────────
    const pathType =
        location.pathname.startsWith('/watch/movie/')   ? 'movie'
        : location.pathname.startsWith('/watch/tv/')    ? 'tv'
        : location.pathname.startsWith('/anime/watch/') ? 'anime'
        : null;

    const contentType = pathType || routeType || 'anime';
    const isMovie  = contentType === 'movie';
    const isTV     = contentType === 'tv';
    const isAnime  = !isMovie && !isTV;
    const contentId = slug || episodeId;
    const navState  = location.state || {};

    // ── Core loading state ──────────────────────────────────────────────────
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState('');

    // ── Movie / TV: raw provider data ───────────────────────────────────────
    const [allProviders, setAllProviders] = useState([]);
    const [subtitles,    setSubtitles]    = useState([]);

    // ── Movie / TV: selection state ─────────────────────────────────────────
    const [activeServerIdx,  setActiveServerIdx]  = useState(0);
    const [activeLanguage,   setActiveLanguage]   = useState('Original Audio');
    const [activeQuality,    setActiveQuality]    = useState('1080');

    // ── Anime: embed servers ────────────────────────────────────────────────
    const [embedServers,    setEmbedServers]    = useState([]);
    const [activeServerIdxAnime, setActiveServerIdxAnime] = useState(0);

    // ── Metadata ────────────────────────────────────────────────────────────
    const [title,       setTitle]       = useState(navState.title || '');
    const [description, setDescription] = useState('');
    const [rating,      setRating]      = useState(null);
    const [poster,      setPoster]      = useState('');
    const [year,        setYear]        = useState('');
    const [genres,      setGenres]      = useState([]);
    const [cast,        setCast]        = useState([]);

    // ── Episodes / seasons ──────────────────────────────────────────────────
    const [episodes,     setEpisodes]     = useState([]);
    const [activeSeason, setActiveSeason] = useState(navState.season || 1);
    const [seasons,      setSeasons]      = useState([]);
    const [currentEpIdx, setCurrentEpIdx] = useState(-1);

    // ── Related content ("More Like This") ─────────────────────────────────
    const [relatedContent, setRelatedContent] = useState([]);

    // ── Auto-next countdown ─────────────────────────────────────────────────
    const [autoNextCount,  setAutoNextCount]  = useState(null);
    const autoNextTimer = useRef(null);

    // ══════════════════════════════════════════════════════════════════════════
    // DERIVED: language/quality selectors + resolved URL
    // ══════════════════════════════════════════════════════════════════════════

    /** All sources for the currently selected server */
    const activeServerSources = useMemo(() => {
        return allProviders[activeServerIdx]?.sources || [];
    }, [allProviders, activeServerIdx]);

    /**
     * Sources grouped by language then by quality.
     * { "Original Audio": { "1080": srcObj, "720": srcObj }, "Hindi": {...} }
     */
    const groupedSources = useMemo(() => {
        return groupSourcesByLanguage(activeServerSources);
    }, [activeServerSources]);

    /** Stable key representing which languages are available */
    const langsKey = useMemo(() => Object.keys(groupedSources).sort().join('|'), [groupedSources]);

    /** Ordered list of available language names */
    const availableLangs = useMemo(() => {
        const keys = Object.keys(groupedSources);
        // Put "Original Audio" first if present
        keys.sort((a, b) => {
            if (a === 'Original Audio') return -1;
            if (b === 'Original Audio') return  1;
            return a.localeCompare(b);
        });
        return keys;
    }, [langsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Ordered list of qualities for the active language (desc: 1080 first) */
    const availableQualities = useMemo(() => {
        const byLang = groupedSources[activeLanguage] || {};
        return sortQualitiesDesc(Object.keys(byLang));
    }, [groupedSources, activeLanguage]);

    /** Stable key for qualities array */
    const qualitiesKey = useMemo(
        () => `${activeLanguage}:${availableQualities.join('|')}`,
        [activeLanguage, availableQualities]
    );

    /** Resolved stream URL */
    const resolvedUrl = useMemo(() => {
        return groupedSources[activeLanguage]?.[activeQuality]?.url || null;
    }, [groupedSources, activeLanguage, activeQuality]);

    // ── Auto-select language when server/sources change ─────────────────────
    useEffect(() => {
        if (availableLangs.length === 0) return;
        const preferred = availableLangs.includes('Original Audio')
            ? 'Original Audio'
            : availableLangs[0];
        setActiveLanguage(preferred);
    }, [langsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-select quality when language changes ────────────────────────────
    useEffect(() => {
        if (availableQualities.length === 0) return;
        const preferred =
            availableQualities.includes('1080') ? '1080' :
            availableQualities.includes('720')  ? '720'  :
            availableQualities[0];
        setActiveQuality(preferred);
    }, [qualitiesKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // ══════════════════════════════════════════════════════════════════════════
    // MOVIE / TV — fetch
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (isAnime || !contentId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');
            setAllProviders([]);
            setActiveServerIdx(0);

            try {
                const [details] = await Promise.all([
                    tmdbService.getDetails(contentType, contentId),
                    tmdbService.getImages(contentType, contentId).catch(() => null),
                ]);

                if (cancelled) return;

                if (details) {
                    setTitle(details.title || details.name || navState.title || '');
                    setDescription(details.overview || '');
                    setRating(details.rating || details.vote_average);
                    setPoster(details.poster || details.backdrop || '');
                    setYear((details.release_date || details.first_air_date || '').substring(0, 4));
                    setGenres(details.genres || []);
                    setCast(details.credits?.cast?.slice(0, 6) || details.cast?.slice(0, 6) || []);
                    if (details.similar?.length) setRelatedContent(details.similar.slice(0, 12));

                    if (isTV && details.seasons?.length) {
                        const nums = details.seasons.filter(s => s.number > 0).map(s => s.number);
                        setSeasons(nums);
                        const s = navState.season || nums[0] || 1;
                        setActiveSeason(s);
                        const epData = await tmdbService.getSeasonEpisodes(contentId, s).catch(() => null);
                        if (!cancelled) setEpisodes(epData?.episodes || []);
                    }
                }

                let allData = [];
                if (isMovie) {
                    allData = await movieService.getAllMovieSources(contentId);
                } else {
                    const ep = navState.episode || 1;
                    const sn = navState.season  || 1;
                    allData = await movieService.getAllTVSources(contentId, sn, ep);
                }

                if (cancelled) return;

                const provs = allData.map(p => ({
                    name:    p.provider,
                    label:   providerLabel(p.provider),
                    sources: p.sources || [],
                }));

                setAllProviders(provs);

                // Extract subtitles from first valid provider
                const firstValidIdx = provs.findIndex(p => p.sources.length > 0);
                const firstData     = allData[firstValidIdx >= 0 ? firstValidIdx : 0];
                setSubtitles(extractSubtitles(firstData));

                if (provs.length === 0 || provs.every(p => p.sources.length === 0)) {
                    setError('No streaming sources available');
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('[Watch] load error:', err);
                    setError('Failed to load content');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [contentId, contentType, isAnime]); // eslint-disable-line react-hooks/exhaustive-deps

    // ══════════════════════════════════════════════════════════════════════════
    // ANIME — fetch (UNTOUCHED — do not modify)
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!isAnime || !contentId) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const embedData = await animeService.getEmbed(contentId);
                const servers   = embedData?.servers || embedData?.data?.servers || [];

                if (cancelled) return;

                if (servers.length > 0) {
                    setEmbedServers(servers);
                    setActiveServerIdxAnime(0);
                } else {
                    setError('No servers available for this episode.');
                }

                const animeId = contentId.replace(/-episode-?\d+.*$/, '') || contentId;
                const info    = await animeService.getInfo(animeId);
                const data    = info?.data || info;

                if (cancelled) return;

                if (data?.title) {
                    setTitle(data.title);
                    setDescription(data.description || '');
                    setPoster(data.image || '');
                    if (data.recommended?.length) setRelatedContent(data.recommended);

                    if (data.seasons?.length > 0) {
                        setSeasons(data.seasons);
                        setActiveSeason(data.seasons[0]);
                        const epData = await animeService.getEpisodes(animeId, data.seasons[0]).catch(() => null);
                        const eps    = epData?.episodes || epData?.data?.episodes || [];
                        if (!cancelled) {
                            setEpisodes(eps);
                            const idx = eps.findIndex(e => e.id === contentId || e.episodeId === contentId);
                            setCurrentEpIdx(idx >= 0 ? idx : 0);
                        }
                    }
                }
            } catch {
                if (!cancelled) setError('Failed to load anime episode');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [contentId, isAnime]);

    // ── Anime embed URL ─────────────────────────────────────────────────────
    const animeEmbedUrl = useMemo(() => {
        if (!isAnime || embedServers.length === 0) return null;
        const s = embedServers[activeServerIdxAnime];
        return s?.url || s?.embedUrl || s?.src || null;
    }, [isAnime, embedServers, activeServerIdxAnime]);

    // ══════════════════════════════════════════════════════════════════════════
    // SERVER / LANGUAGE / QUALITY handlers
    // ══════════════════════════════════════════════════════════════════════════
    const handleServerChange = useCallback((idx) => {
        if (idx === activeServerIdx) return;
        setActiveServerIdx(idx);
        setError('');
        // Language/quality auto-reset via effects when groupedSources recomputes
    }, [activeServerIdx]);

    const handleLanguageChange = useCallback((lang) => {
        if (lang === activeLanguage) return;
        setActiveLanguage(lang);
        // Quality auto-resets via qualitiesKey effect
    }, [activeLanguage]);

    // ══════════════════════════════════════════════════════════════════════════
    // STREAM FAILOVER — onError from VideoPlayer
    // ══════════════════════════════════════════════════════════════════════════
    const handleStreamError = useCallback(() => {
        // 1. Try next quality for this language in this server
        const qIdx = availableQualities.indexOf(activeQuality);
        if (qIdx >= 0 && qIdx < availableQualities.length - 1) {
            console.warn(`[Watch] failover → quality: ${availableQualities[qIdx + 1]}`);
            setActiveQuality(availableQualities[qIdx + 1]);
            return;
        }

        // 2. All qualities exhausted → try next server
        if (activeServerIdx < allProviders.length - 1) {
            const next = activeServerIdx + 1;
            console.warn(`[Watch] failover → server: ${allProviders[next]?.label}`);
            setActiveServerIdx(next);
            // Language/quality will auto-reset via derived effects
            return;
        }

        // 3. All servers exhausted
        setError('All streaming sources failed. Please try a different server or check back later.');
    }, [availableQualities, activeQuality, activeServerIdx, allProviders]);

    // ══════════════════════════════════════════════════════════════════════════
    // AUTO-NEXT (episode countdown)
    // ══════════════════════════════════════════════════════════════════════════
    const handleVideoEnd = useCallback(() => {
        if (episodes.length === 0 || currentEpIdx < 0 || currentEpIdx >= episodes.length - 1) return;
        setAutoNextCount(10);
    }, [episodes, currentEpIdx]);

    useEffect(() => {
        if (autoNextCount === null) return;
        if (autoNextCount <= 0) {
            const next = episodes[currentEpIdx + 1];
            if (next) {
                if (isAnime) navigate(`/anime/watch/${next.episodeId || next.id}`);
                else         handleTVEpisodeClick(next);
            }
            setAutoNextCount(null);
            return;
        }
        autoNextTimer.current = setTimeout(() => setAutoNextCount(c => c - 1), 1000);
        return () => clearTimeout(autoNextTimer.current);
    }, [autoNextCount]); // eslint-disable-line react-hooks/exhaustive-deps

    const cancelAutoNext = useCallback(() => {
        setAutoNextCount(null);
        clearTimeout(autoNextTimer.current);
    }, []);

    // ══════════════════════════════════════════════════════════════════════════
    // SEASON / EPISODE handlers
    // ══════════════════════════════════════════════════════════════════════════
    const handleSeasonChange = useCallback(async (s) => {
        setActiveSeason(s);
        try {
            if (isTV) {
                const epData = await tmdbService.getSeasonEpisodes(contentId, s);
                setEpisodes(epData?.episodes || []);
            } else if (isAnime) {
                const animeId = contentId.replace(/-episode-?\d+.*$/, '') || contentId;
                const epData  = await animeService.getEpisodes(animeId, s);
                setEpisodes(epData?.episodes || epData?.data?.episodes || []);
            }
        } catch { /* silent */ }
    }, [contentId, isTV, isAnime]);

    const handleTVEpisodeClick = useCallback(async (ep) => {
        const s = activeSeason;
        const e = ep.episode_number || ep.episodeNumber || ep.number || 1;
        setLoading(true);
        setError('');
        try {
            const allData = await movieService.getAllTVSources(contentId, s, e);
            const provs   = allData.map(p => ({
                name:    p.provider,
                label:   providerLabel(p.provider),
                sources: p.sources || [],
            }));
            setAllProviders(provs);
            setActiveServerIdx(0);
            setTitle(prev => `${prev.split(' S')[0]} S${s}E${e}`);

            const firstValidIdx = provs.findIndex(p => p.sources.length > 0);
            const firstData     = allData[firstValidIdx >= 0 ? firstValidIdx : 0];
            setSubtitles(extractSubtitles(firstData));

            if (provs.length === 0 || provs.every(p => p.sources.length === 0)) {
                setError('No streaming sources available');
            }
        } catch {
            setError('Failed to load episode');
        } finally {
            setLoading(false);
        }
    }, [contentId, activeSeason]);

    // ══════════════════════════════════════════════════════════════════════════
    // EARLY RENDERS
    // ══════════════════════════════════════════════════════════════════════════
    if (loading && !animeEmbedUrl && allProviders.length === 0) {
        return (
            <div className="watch-page">
                <div className="watch-loading">
                    <div className="watch-loading__spinner" />
                    <span className="watch-loading__text">Loading media…</span>
                </div>
            </div>
        );
    }

    if (error && !animeEmbedUrl && allProviders.length === 0) {
        return (
            <div className="watch-page">
                <div className="watch-error">
                    <span className="watch-error__icon">⚠️</span>
                    <p className="watch-error__msg">{error}</p>
                    <button
                        style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', background: '#e50914', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                    <Link to="/" style={{ marginTop: '1rem', display: 'block', color: '#aaa', textDecoration: 'none' }}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="watch-page">

            {/* ──────────────────────────────────────────────────────────────
                PLAYER SECTION
            ────────────────────────────────────────────────────────────── */}
            <div className="watch-player-section">
                {isAnime ? (
                    /* Anime: iframe embed via VideoPlayer */
                    <VideoPlayer
                        src={null}
                        embedUrl={animeEmbedUrl}
                        subtitles={subtitles}
                        poster={poster}
                        title={title}
                        autoPlay
                        onEnded={handleVideoEnd}
                    />
                ) : (
                    /* Movie / TV: direct VideoPlayer with resolved URL */
                    <VideoPlayer
                        src={resolvedUrl}
                        subtitles={subtitles}
                        poster={poster}
                        title={title}
                        autoPlay
                        onEnded={handleVideoEnd}
                        onError={handleStreamError}
                    />
                )}
            </div>

            {/* ──────────────────────────────────────────────────────────────
                ANIME SERVER SELECTOR (untouched)
            ────────────────────────────────────────────────────────────── */}
            {isAnime && embedServers.length > 0 && (
                <div className="watch-servers">
                    <div className="watch-servers__group">
                        <div className="watch-servers__label">Server</div>
                        <div className="watch-servers__list">
                            {embedServers.map((srv, idx) => (
                                <button
                                    key={srv.name || idx}
                                    className={`watch-servers__btn ${idx === activeServerIdxAnime ? 'watch-servers__btn--active' : ''}`}
                                    onClick={() => setActiveServerIdxAnime(idx)}
                                >
                                    <span className="watch-servers__icon">🎮</span>
                                    {srv.name || srv.serverName || `Server ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────
                MOVIE / TV SOURCE SELECTORS
                Order: Server → Language → Quality
            ────────────────────────────────────────────────────────────── */}
            {!isAnime && allProviders.length > 0 && (
                <div style={{
                    maxWidth:   '1200px',
                    margin:     '0 auto',
                    padding:    '14px 20px 4px',
                    display:    'flex',
                    flexDirection: 'column',
                    gap:        '12px',
                }}>
                    {/* ── Server row ── */}
                    <SelectorRow
                        label="Server"
                        color="red"
                        items={allProviders.map((_, i) => i)}
                        activeItem={activeServerIdx}
                        getLabel={i => allProviders[i]?.label || allProviders[i]?.name}
                        onSelect={handleServerChange}
                    />

                    {/* ── Language row ── */}
                    {availableLangs.length > 1 && (
                        <SelectorRow
                            label="Language"
                            color="blue"
                            items={availableLangs}
                            activeItem={activeLanguage}
                            getLabel={lang => lang}
                            onSelect={handleLanguageChange}
                        />
                    )}

                    {/* ── Quality row ── */}
                    {availableQualities.length > 1 && (
                        <SelectorRow
                            label="Quality"
                            color="green"
                            items={availableQualities}
                            activeItem={activeQuality}
                            getLabel={q => `${q}p`}
                            onSelect={setActiveQuality}
                        />
                    )}

                    {/* ── Stream error notice (non-fatal, sources still available) ── */}
                    {error && allProviders.length > 0 && (
                        <p style={{ color: '#ef5350', fontSize: '0.85rem', margin: 0 }}>
                            ⚠ {error}
                        </p>
                    )}
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────
                AUTO-NEXT COUNTDOWN BANNER
            ────────────────────────────────────────────────────────────── */}
            {autoNextCount !== null && (
                <div style={{
                    position:   'fixed',
                    bottom:     '2rem',
                    right:      '2rem',
                    background: 'rgba(10,10,10,0.95)',
                    color:      '#fff',
                    padding:    '1rem 1.5rem',
                    borderRadius: '10px',
                    zIndex:     999,
                    border:     '1px solid rgba(255,255,255,0.08)',
                    boxShadow:  '0 4px 24px rgba(0,0,0,0.5)',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        '12px',
                }}>
                    <span>Next episode in {autoNextCount}s</span>
                    <button
                        onClick={cancelAutoNext}
                        style={{ background: 'transparent', color: '#e50914', border: '1px solid #e50914', borderRadius: '5px', padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────
                CONTENT LAYOUT — info, episodes, related
            ────────────────────────────────────────────────────────────── */}
            <div
                className="watch-content-layout"
                style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}
            >
                {/* ── Title + metadata ── */}
                <div className="watch-info">
                    <h1
                        className="watch-info__title"
                        style={{ fontSize: '2rem', marginBottom: '10px', fontWeight: 700 }}
                    >
                        {title}
                    </h1>
                    <div
                        className="watch-info__meta"
                        style={{ display: 'flex', gap: '14px', color: '#aaa', fontSize: '1rem', marginBottom: '18px', flexWrap: 'wrap' }}
                    >
                        {year    && <span>{year}</span>}
                        {rating  && (
                            <span style={{ color: '#ffb400', fontWeight: 'bold' }}>
                                ⭐ {typeof rating === 'number' ? rating.toFixed(1) : rating}
                            </span>
                        )}
                        <span style={{ textTransform: 'capitalize' }}>{contentType}</span>
                        {genres.length > 0 && (
                            <span>{genres.map(g => g.name || g).join(' • ')}</span>
                        )}
                    </div>
                    {description && (
                        <p
                            className="watch-info__desc"
                            style={{ fontSize: '1rem', lineHeight: '1.65', color: '#ccc', maxWidth: '820px', marginBottom: '14px' }}
                        >
                            {description}
                        </p>
                    )}
                    {cast.length > 0 && (
                        <div className="watch-cast" style={{ marginTop: '10px' }}>
                            <span style={{ color: '#888' }}>Starring: </span>
                            <span style={{ color: '#ddd' }}>{cast.map(c => c.name).join(', ')}</span>
                        </div>
                    )}
                </div>

                {/* ── Episode navigation (TV + Anime) ── */}
                {(isAnime || isTV) && episodes.length > 0 && (
                    <div className="watch-episodes" style={{ marginTop: '40px' }}>
                        <div
                            className="watch-episodes__header"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}
                        >
                            <h2 className="watch-episodes__title" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                                Episodes
                            </h2>
                            {seasons.length > 1 && (
                                <select
                                    className="watch-episodes__season-select"
                                    value={activeSeason}
                                    onChange={e => handleSeasonChange(parseInt(e.target.value))}
                                    style={{ padding: '8px 12px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                    {seasons.map(s => (
                                        <option key={s} value={s}>Season {s}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div
                            className="watch-episodes__grid"
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}
                        >
                            {episodes.map((ep, idx) => {
                                const epId     = ep.episodeId || ep.id;
                                const isActive = isAnime
                                    ? (epId === contentId)
                                    : (idx === currentEpIdx);
                                return (
                                    <button
                                        key={epId || idx}
                                        className={`watch-episodes__card ${isActive ? 'watch-episodes__card--active' : ''}`}
                                        onClick={() => {
                                            if (isAnime) {
                                                navigate(`/anime/watch/${epId}`);
                                            } else {
                                                setCurrentEpIdx(idx);
                                                handleTVEpisodeClick(ep);
                                            }
                                        }}
                                        style={{
                                            background:   isActive ? '#2a1a1a' : '#111',
                                            border:       isActive ? '1.5px solid #e50914' : '1px solid rgba(255,255,255,0.07)',
                                            padding:      '10px 12px',
                                            borderRadius: '8px',
                                            textAlign:    'left',
                                            cursor:       'pointer',
                                            transition:   'border-color 0.2s',
                                        }}
                                    >
                                        <div
                                            className="watch-episodes__ep-num"
                                            style={{ color: '#888', fontSize: '0.85rem', marginBottom: '4px' }}
                                        >
                                            EP {ep.episode || ep.episode_number || ep.number || idx + 1}
                                        </div>
                                        <div
                                            className="watch-episodes__ep-title"
                                            style={{ color: '#ddd', fontSize: '0.95rem', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                        >
                                            {ep.title || ep.name || `Episode ${idx + 1}`}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ──────────────────────────────────────────────────────────
                    MORE LIKE THIS — recommendation grid (PRESERVED)
                ────────────────────────────────────────────────────────── */}
                {relatedContent.length > 0 && (
                    <div className="watch-related" style={{ marginTop: '48px' }}>
                        <h2
                            className="watch-related__title"
                            style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}
                        >
                            More Like This
                        </h2>
                        <div
                            className="watch-related__grid"
                            style={{
                                display:             'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap:                 '16px',
                            }}
                        >
                            {relatedContent.map((item, idx) => {
                                const link = item.contentType === 'anime' || isAnime
                                    ? `/anime/info/${item.id}`
                                    : item.type === 'tv'
                                        ? `/info/tv/${item.tmdbId || item.id}`
                                        : `/info/movie/${item.tmdbId || item.id}`;

                                const posterUrl =
                                    item.poster ||
                                    item.image  ||
                                    (item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null);

                                return (
                                    <Link
                                        key={item.id || idx}
                                        to={link}
                                        className="watch-related__card"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <div
                                            className="watch-related__poster"
                                            style={{
                                                borderRadius: '8px',
                                                overflow:     'hidden',
                                                aspectRatio:  '2/3',
                                                background:   '#1a1a1a',
                                                position:     'relative',
                                            }}
                                        >
                                            {posterUrl ? (
                                                <img
                                                    src={posterUrl}
                                                    alt={item.title || item.name || ''}
                                                    loading="lazy"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <span style={{ color: '#555', fontSize: '12px' }}>No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className="watch-related__card-title"
                                            style={{
                                                display:      'block',
                                                marginTop:    '8px',
                                                color:        '#ccc',
                                                fontSize:     '0.875rem',
                                                lineHeight:   1.35,
                                                whiteSpace:   'nowrap',
                                                overflow:     'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {item.title || item.name}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>{/* /watch-content-layout */}
        </div>
    );
}