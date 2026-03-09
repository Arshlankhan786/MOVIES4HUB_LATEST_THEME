import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Link } from 'react-router-dom';
import tmdbService from '../services/tmdbService';
import animeService from '../services/animeService';
import AdBanner from '../components/AdBanner';
import ErrorState from '../components/ErrorState';
import SEOHead from '../components/SEOHead';
import { SkeletonRow, SkeletonHero } from '../components/SkeletonCard';
import './Home.css';

/* ═══════════════════════════════════════
   ContentCard — Memoized card component
   ═══════════════════════════════════════ */
const NO_IMG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="270"><rect fill="%231a1a2e" width="180" height="270"/><text x="90" y="135" fill="%23555" text-anchor="middle" font-size="14">No Image</text></svg>';

const ContentCard = memo(function ContentCard({ item, linkBase }) {
    let link;
    if (linkBase) {
        link = `${linkBase}/${item.id}`;
    } else if (item.contentType === 'anime' || item._type === 'anime') {
        link = `/anime/info/${item.id}`;
    } else if (item.type === 'tv' || item.contentType === 'series') {
        link = `/info/tv/${item.tmdbId || item.id}`;
    } else {
        link = `/info/movie/${item.tmdbId || item.id}`;
    }

    const poster = item.poster || item.image || null;

    return (
        <Link to={link} className="grid-card" id={`card-${item.id}`}>
            <div className="grid-card__poster">
                <img
                    src={poster || NO_IMG}
                    alt={item.title || item.name || ''}
                    loading="lazy"
                    onError={(e) => { e.target.src = NO_IMG; }}
                />
                <div className="grid-card__overlay">
                    <div className="grid-card__play">▶</div>
                </div>
                {item.type && <span className="grid-card__type">{item.contentType || item.type}</span>}
                {item.rating > 0 && (
                    <span className="grid-card__rating">⭐ {Number(item.rating).toFixed(1)}</span>
                )}
                {item.year && <span className="grid-card__year">{item.year}</span>}
                {item.episodes && <span className="grid-card__ep">{item.episodes}</span>}
            </div>
            <div className="grid-card__info">
                <h3 className="grid-card__title">{item.title || item.name || ''}</h3>
            </div>
        </Link>
    );
});

/* ═══════════════════════════════════════
   ContentRow — Grid-based row with lazy loading
   ═══════════════════════════════════════ */
const ContentRow = memo(function ContentRow({ title, items = [], linkBase, viewAllLink, loading = false }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (loading) {
        return (
            <section className="content-row" ref={ref}>
                <div className="content-row__header">
                    <h2 className="content-row__title">{title}</h2>
                </div>
                <div className="content-grid">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="grid-card grid-card--skeleton">
                            <div className="grid-card__poster skeleton-pulse" />
                            <div className="grid-card__info">
                                <div className="skeleton-text skeleton-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (!items || items.length === 0) return null;

    return (
        <section className="content-row" ref={ref}>
            <div className="content-row__header">
                <h2 className="content-row__title">{title}</h2>
                {viewAllLink && (
                    <Link to={viewAllLink} className="content-row__viewall">View All →</Link>
                )}
            </div>
            {visible && (
                <div className="content-grid">
                    {items.map((item, idx) => (
                        <ContentCard key={`${item.id}-${idx}`} item={item} linkBase={linkBase} />
                    ))}
                </div>
            )}
        </section>
    );
});

/* ═══════════════════════════════════════
   HeroSlider — Smooth crossfade banner
   ═══════════════════════════════════════ */
function HeroSlider({ items = [] }) {
    const [current, setCurrent] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goTo = useCallback((idx) => {
        if (idx === current) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrent(idx);
            setIsTransitioning(false);
        }, 400);
    }, [current]);

    useEffect(() => {
        if (items.length <= 1) return;
        const timer = setInterval(() => {
            goTo((current + 1) % items.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [current, items.length, goTo]);

    if (!items.length) return null;

    const item = items[current];
    const bg = item.backdrop || item.image || item.poster || '';

    let link;
    if (item.contentType === 'anime' || item._type === 'anime') {
        link = `/anime/info/${item.id}`;
    } else if (item.type === 'tv' || item.contentType === 'series') {
        link = `/info/tv/${item.tmdbId || item.id}`;
    } else {
        link = `/info/movie/${item.tmdbId || item.id}`;
    }

    return (
        <section className={`hero-slider ${isTransitioning ? 'hero-slider--fading' : ''}`}>
            <div className="hero-slider__bg" style={{ backgroundImage: `url(${bg})` }} />
            <div className="hero-slider__overlay" />
            <div className="hero-slider__content">
                <span className="hero-slider__badge">🔥 Trending #{current + 1}</span>
                <h1 className="hero-slider__title">{item.title || item.name}</h1>
                <div className="hero-slider__meta">
                    {item.contentType && <span className="hero-slider__tag">{item.contentType.toUpperCase()}</span>}
                    {item.year && <span className="hero-slider__tag">{item.year}</span>}
                    {item.rating > 0 && <span className="hero-slider__tag">⭐ {Number(item.rating).toFixed(1)}</span>}
                </div>
                {item.description && (
                    <p className="hero-slider__desc">
                        {item.description.length > 180 ? item.description.slice(0, 180) + '...' : item.description}
                    </p>
                )}
                <div className="hero-slider__actions">
                    <Link to={link} className="hero-slider__btn hero-slider__btn--primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                        Watch Now
                    </Link>
                    <Link to={link} className="hero-slider__btn hero-slider__btn--secondary">
                        Details
                    </Link>
                </div>
                <div className="hero-slider__dots">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            className={`hero-slider__dot ${i === current ? 'active' : ''}`}
                            onClick={() => goTo(i)}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════
   Home — Main page (Netflix-style mixed content)
   ═══════════════════════════════════════ */
export default function Home() {
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [popularMovies, setPopularMovies] = useState([]);
    const [topRatedMovies, setTopRatedMovies] = useState([]);
    const [trendingTV, setTrendingTV] = useState([]);
    const [animeData, setAnimeData] = useState(null);
    const [heroItems, setHeroItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            // Fetch all data in parallel
            const [
                trendingRes,
                popularRes,
                topRatedRes,
                trendingTVRes,
                animeRes,
            ] = await Promise.allSettled([
                tmdbService.getTrending('movie', 'week'),
                tmdbService.getPopular('movie'),
                tmdbService.getTopRated('movie'),
                tmdbService.getTrending('tv', 'week'),
                animeService.getHome(),
            ]);

            // Process TMDB results
            const trending = trendingRes.status === 'fulfilled' ? trendingRes.value.results || [] : [];
            const popular = popularRes.status === 'fulfilled' ? popularRes.value.results || [] : [];
            const topRated = topRatedRes.status === 'fulfilled' ? topRatedRes.value.results || [] : [];
            const tvTrending = trendingTVRes.status === 'fulfilled' ? trendingTVRes.value.results || [] : [];

            setTrendingMovies(trending.slice(0, 20));
            setPopularMovies(popular.slice(0, 20));
            setTopRatedMovies(topRated.slice(0, 20));
            setTrendingTV(tvTrending.slice(0, 20));

            // Process anime results
            const anime = animeRes.status === 'fulfilled' ? (animeRes.value?.data || animeRes.value) : null;
            if (anime && anime.success !== false) {
                setAnimeData(anime);
            }

            // Build hero items — mix of trending movies + anime
            const heroMovies = trending.slice(0, 4).map(m => ({ ...m, _type: 'movie' }));
            const heroAnime = (anime?.newestDrops || []).slice(0, 2).map(a => ({
                ...a, _type: 'anime', contentType: 'anime',
                poster: a.image, backdrop: a.image,
            }));
            setHeroItems([...heroMovies, ...heroAnime]);

            // Only error if EVERYTHING failed
            if (trending.length === 0 && popular.length === 0 && !anime) {
                setError('Failed to load content. Please try again.');
            }
        } catch (err) {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Anime rows from AnimeVerse data
    const animeNewest = animeData?.newestDrops?.map(a => ({
        ...a, contentType: 'anime', _type: 'anime', poster: a.image,
    })) || [];
    const animePopular = animeData?.mostWatchedShows?.map(a => ({
        ...a, contentType: 'anime', _type: 'anime', poster: a.image,
    })) || [];
    const animeMovies = animeData?.animeMovies?.map(a => ({
        ...a, contentType: 'anime', _type: 'anime', poster: a.image,
    })) || [];

    if (loading) {
        return (
            <div className="home">
                <SEOHead title="Movies4Hub — Stream Movies & Anime" />
                <SkeletonHero />
                <div className="home__content">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="home home--error">
                <ErrorState message={error} onRetry={fetchData} />
            </div>
        );
    }

    return (
        <div className="home">
            <SEOHead
                title="Movies4Hub — Stream Movies, Anime & Series"
                description="Watch unlimited movies, anime, and TV series in HD. Free streaming platform."
            />

            <HeroSlider items={heroItems} />

            <div className="home__content">
                <AdBanner placement="home_banner" />

                <ContentRow
                    title="🔥 Trending Movies"
                    items={trendingMovies}
                />
                <ContentRow
                    title="🌟 Trending Anime"
                    items={animeNewest}
                    linkBase="/anime/info"
                    viewAllLink="/anime/category/anime"
                />
                <ContentRow
                    title="📺 Trending Series"
                    items={trendingTV}
                />

                <AdBanner placement="between_content" />

                <ContentRow
                    title="🎬 Popular Movies"
                    items={popularMovies}
                />
                <ContentRow
                    title="🏆 Top Rated Movies"
                    items={topRatedMovies}
                />
                <ContentRow
                    title="🔥 Most Watched Anime"
                    items={animePopular}
                    linkBase="/anime/info"
                />
                <ContentRow
                    title="🎥 Anime Movies"
                    items={animeMovies}
                    linkBase="/anime/info"
                    viewAllLink="/anime/movies"
                />

                <AdBanner placement="footer" />
            </div>
        </div>
    );
}
