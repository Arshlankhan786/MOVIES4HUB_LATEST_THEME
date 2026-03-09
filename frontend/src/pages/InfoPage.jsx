/**
 * frontend/pages/InfoPage.jsx
 *
 * BUG FIX applied in this version:
 *  TV shows expose `name` not `title` from TMDB.
 *  The old guard `if (info && info.title)` caused TV shows that only had
 *  `info.name` to silently show "Content not found".
 *  Fixed: `if (info && (info.title || info.name))`
 *
 *  All other logic is unchanged.
 */

import { useState, useEffect, useMemo, memo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import animeService     from '../services/animeService';
import tmdbService      from '../services/tmdbService';
import WatchlistButton  from '../components/WatchlistButton';
import SEOHead          from '../components/SEOHead';
import LoadingSpinner   from '../components/LoadingSpinner';
import ErrorState       from '../components/ErrorState';
import './InfoPage.css';

const SkeletonInfo = memo(function SkeletonInfo() {
    return (
        <div className="info-skeleton">
            <div className="info-skeleton__backdrop shimmer" />
            <div className="info-skeleton__body">
                <div className="info-skeleton__poster shimmer" />
                <div className="info-skeleton__details">
                    <div className="info-skeleton__title shimmer" />
                    <div className="info-skeleton__tags">
                        <div className="info-skeleton__tag shimmer" />
                        <div className="info-skeleton__tag shimmer" />
                        <div className="info-skeleton__tag shimmer" />
                    </div>
                    <div className="info-skeleton__desc shimmer" />
                    <div className="info-skeleton__desc shimmer" style={{ width: '70%' }} />
                </div>
            </div>
        </div>
    );
});

const EpisodeCard = memo(function EpisodeCard({ ep }) {
    const link = `/watch/${ep.episodeId || ep.id}`;
    return (
        <Link to={link} className="ep-card">
            <div className="ep-card__number">{ep.number || ep.episode || '—'}</div>
            <div className="ep-card__title">{ep.title || ep.name || `Episode ${ep.number || ''}`}</div>
        </Link>
    );
});

export default function InfoPage() {
    const { id, type: routeType, slug } = useParams();
    const navigate = useNavigate();

    const [data,          setData]          = useState(null);
    const [episodes,      setEpisodes]      = useState([]);
    const [seasons,       setSeasons]       = useState([]);
    const [activeSeason,  setActiveSeason]  = useState(1);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState('');
    const [shared,        setShared]        = useState(false);
    const [previewImages, setPreviewImages] = useState([]);

    const contentType = routeType || 'anime';
    const contentId   = slug || id;
    const isMovie     = contentType === 'movie';
    const isTV        = contentType === 'tv';
    const isTMDB      = isMovie || isTV;

    useEffect(() => {
        setLoading(true);
        setError('');
        setEpisodes([]);
        setSeasons([]);

        if (isTMDB) {
            tmdbService.getDetails(contentType, contentId)
                .then((info) => {
                    // ── FIXED: TV shows use `name` not `title` ──
                    if (info && (info.title || info.name)) {
                        setData(info);
                        if (info.seasons?.length > 0) {
                            setSeasons(info.seasons.filter(s => s.number > 0));
                            const firstSeason = info.seasons.find(s => s.number > 0);
                            if (firstSeason) setActiveSeason(firstSeason.number);
                        }
                        document.title = `${info.title || info.name} — Movies4Hub`;
                    } else {
                        setError('Content not found');
                    }
                })
                .catch(() => setError('Failed to load content'))
                .finally(() => setLoading(false));
        } else {
            animeService.getInfo(contentId)
                .then((res) => {
                    const info = res?.data || res;
                    if (info && (info.title || info.name)) {
                        setData(info);
                        const sArr = info.seasons || [];
                        setSeasons(sArr);
                        if (sArr.length > 0) setActiveSeason(sArr[0]?.number || 1);
                        document.title = `${info.title || info.name} — Movies4Hub`;
                    } else {
                        setError('Content not found');
                    }
                })
                .catch(() => setError('Failed to load content'))
                .finally(() => setLoading(false));
        }
    }, [contentId, contentType, isTMDB]);

    // Fetch preview images
    useEffect(() => {
        if (!isTMDB || !contentId) return;
        tmdbService.getImages(contentType, contentId)
            .then((imgs) => {
                if (imgs?.backdrops?.length) setPreviewImages(imgs.backdrops.slice(0, 4));
            })
            .catch(() => {});
    }, [contentId, contentType, isTMDB]);

    // Fetch episodes
    useEffect(() => {
        if (!data) return;
        if (isTV) {
            tmdbService.getSeasonEpisodes(contentId, activeSeason)
                .then((res) => setEpisodes(res?.episodes || []))
                .catch(() => setEpisodes([]));
        } else if (!isMovie) {
            animeService.getEpisodes(contentId, activeSeason)
                .then((res) => {
                    const eps = res?.episodes || res?.data?.episodes || [];
                    setEpisodes(eps);
                })
                .catch(() => setEpisodes([]));
        }
    }, [contentId, activeSeason, data, isTV, isMovie]);

    const genres = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data.genres)) {
            return data.genres.map(g => typeof g === 'string' ? g : g.name || g);
        }
        return data.genre?.split(',').map((g) => g.trim()) || [];
    }, [data]);

    const handleShare = () => {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: data?.title || data?.name, url });
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    const handleWatchMovie = () => {
        if (!data?.tmdbId && !contentId) return;
        navigate(`/watch/movie/${data?.tmdbId || contentId}`, {
            state: {
                title:  data?.title || data?.name || '',
                tmdbId: data?.tmdbId || contentId,
                type:   'movie',
            },
        });
    };

    const handleWatchTVEpisode = (season, episodeNum) => {
        navigate(`/watch/tv/${data?.tmdbId || contentId}`, {
            state: {
                title:     `${data?.title || data?.name || ''} S${season}E${episodeNum}`,
                tmdbId:    data?.tmdbId || contentId,
                type:      'tv',
                mediaType: 'tv',
                season,
                episode:   episodeNum,
            },
        });
    };

    if (loading) return <div className="info-page"><SkeletonInfo /></div>;
    if (error)   return (
        <div className="info-page">
            <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
    );
    if (!data) return null;

    const poster      = data.poster || data.image || '';
    const backdrop    = data.backdrop || poster;
    const title       = data.title || data.name || '';
    const description = data.description || data.overview || data.synopsis || '';
    const rating      = data.rating || data.vote_average || data.score || null;
    const type        = data.contentType || data.type || 'series';
    const status      = data.status || '';

    return (
        <div className="info-page">
            <SEOHead
                title={title}
                description={description?.slice(0, 160)}
                image={poster}
                type="video.movie"
            />

            <div className="info-backdrop" style={{ backgroundImage: `url(${backdrop})` }}>
                <div className="info-backdrop__gradient" />
            </div>

            <div className="info-content">
                <div className="info-hero">
                    <div className="info-poster">
                        {poster
                            ? <img src={poster} alt={title} className="info-poster__img" loading="lazy" />
                            : <div className="info-poster__empty">🎬</div>
                        }
                    </div>

                    <div className="info-details">
                        <h1 className="info-details__title">{title}</h1>

                        <div className="info-details__meta">
                            {type   && <span className="info-badge info-badge--type">{type.toUpperCase()}</span>}
                            {status && <span className="info-badge info-badge--status">{status}</span>}
                            {data.year    && <span className="info-badge">{data.year}</span>}
                            {data.runtime && <span className="info-badge">{data.runtime} min</span>}
                            {rating && (
                                <span className="info-badge info-badge--rating">
                                    ⭐ {typeof rating === 'number' ? rating.toFixed(1) : rating}
                                </span>
                            )}
                        </div>

                        {data.tagline && <p className="info-tagline">"{data.tagline}"</p>}

                        {genres.length > 0 && (
                            <div className="info-genres">
                                {genres.map((g, i) => <span key={i} className="info-genre">{g}</span>)}
                            </div>
                        )}

                        {description && <p className="info-details__desc">{description}</p>}

                        <div className="info-actions">
                            {isMovie ? (
                                <button
                                    className="info-actions__btn info-actions__btn--watch"
                                    onClick={handleWatchMovie}
                                >
                                    ▶ Watch Now
                                </button>
                            ) : isTV ? (
                                episodes.length > 0 && (
                                    <button
                                        className="info-actions__btn info-actions__btn--watch"
                                        onClick={() => {
                                            const firstEp = episodes[0];
                                            handleWatchTVEpisode(
                                                activeSeason,
                                                firstEp?.episode_number || firstEp?.number || 1
                                            );
                                        }}
                                    >
                                        ▶ Watch S{activeSeason}E1
                                    </button>
                                )
                            ) : null}

                            <WatchlistButton contentId={data?.tmdbId || contentId} contentType={contentType} />

                            <button className="info-actions__btn info-actions__btn--share" onClick={handleShare}>
                                {shared ? '✓ Copied!' : '⤴ Share'}
                            </button>
                        </div>

                        {/* Preview images */}
                        {previewImages.length > 0 && (
                            <div className="info-previews">
                                {previewImages.map((img, i) => (
                                    <img key={i} src={img.url} alt={`Preview ${i + 1}`} className="info-preview-img" loading="lazy" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Season selector (TV) */}
                {isTV && seasons.length > 1 && (
                    <div className="info-seasons">
                        <h2 className="info-seasons__title">Seasons</h2>
                        <div className="info-seasons__list">
                            {seasons.map(s => (
                                <button
                                    key={s.number}
                                    className={`info-seasons__btn ${activeSeason === s.number ? 'info-seasons__btn--active' : ''}`}
                                    onClick={() => setActiveSeason(s.number)}
                                >
                                    Season {s.number}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Episodes list */}
                {!isMovie && episodes.length > 0 && (
                    <div className="info-episodes">
                        <h2 className="info-episodes__title">
                            {isTV ? `Season ${activeSeason} Episodes` : 'Episodes'}
                        </h2>
                        <div className="info-episodes__grid">
                            {episodes.map((ep, idx) => (
                                isTV ? (
                                    <button
                                        key={ep.id || idx}
                                        className="ep-card ep-card--tv"
                                        onClick={() => handleWatchTVEpisode(activeSeason, ep.episode_number || ep.number || idx + 1)}
                                    >
                                        <div className="ep-card__number">E{ep.episode_number || ep.number || idx + 1}</div>
                                        <div className="ep-card__title">{ep.name || ep.title || `Episode ${idx + 1}`}</div>
                                    </button>
                                ) : (
                                    <EpisodeCard key={ep.episodeId || ep.id || idx} ep={ep} />
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}