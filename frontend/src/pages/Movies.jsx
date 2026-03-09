import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import tmdbService from '../services/tmdbService';
import SEOHead from '../components/SEOHead';
import { SkeletonRow } from '../components/SkeletonCard';
import ErrorState from '../components/ErrorState';
import './Movies.css';

const NO_IMG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="270"><rect fill="%231a1a2e" width="180" height="270"/><text x="90" y="135" fill="%23555" text-anchor="middle" font-size="14">No Image</text></svg>';

const MovieCard = memo(function MovieCard({ item }) {
    const link = `/info/${item.type === 'tv' ? 'tv' : 'movie'}/${item.tmdbId || item.id}`;
    return (
        <Link to={link} className="movie-card" id={`movie-${item.id}`}>
            <div className="movie-card__poster">
                <img
                    src={item.poster || item.image || NO_IMG}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => { e.target.src = NO_IMG; }}
                />
                <div className="movie-card__overlay">
                    <div className="movie-card__play">▶</div>
                </div>
                {item.rating > 0 && (
                    <span className="movie-card__rating">⭐ {Number(item.rating).toFixed(1)}</span>
                )}
                {item.year && <span className="movie-card__year">{item.year}</span>}
            </div>
            <div className="movie-card__info">
                <h3 className="movie-card__title">{item.title}</h3>
            </div>
        </Link>
    );
});

export default function Movies() {
    const [trending, setTrending] = useState([]);
    const [popular, setPopular] = useState([]);
    const [topRated, setTopRated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [trendRes, popRes, topRes] = await Promise.allSettled([
                tmdbService.getTrending('movie'),
                tmdbService.getPopular('movie'),
                tmdbService.getTopRated('movie'),
            ]);

            const trendingData =
                trendRes.status === 'fulfilled' ? trendRes.value?.results || [] : [];

            const popularData =
                popRes.status === 'fulfilled' ? popRes.value?.results || [] : [];

            const topRatedData =
                topRes.status === 'fulfilled' ? topRes.value?.results || [] : [];

            setTrending(trendingData);
            setPopular(popularData);
            setTopRated(topRatedData);

            const allFailed =
                trendRes.status === 'rejected' &&
                popRes.status === 'rejected' &&
                topRes.status === 'rejected';

            if (allFailed) {
                setError('Failed to load movies. API might be temporarily unavailable.');
            } else if (!trendingData.length && !popularData.length && !topRatedData.length) {
                // If the API calls succeeded but returned zero items across the board.
                setError('No movies found.');
            }
        } catch {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (error && !trending.length && !popular.length) {
        return (
            <div className="movies-page movies-page--error">
                <ErrorState message={error} onRetry={fetchData} />
            </div>
        );
    }

    return (
        <div className="movies-page">
            <SEOHead title="Movies" description="Browse trending and popular movies on Movies4Hub" />

            <div className="movies-header">
                <h1>🎬 Movies</h1>
                <p>Browse trending, popular, and top-rated movies</p>
            </div>

            <div className="movies-content">
                {loading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : (
                    <>
                        {trending.length > 0 && (
                            <section className="movies-section">
                                <h2 className="movies-section__title">🔥 Trending This Week</h2>
                                <div className="movies-grid">
                                    {trending.slice(0, 20).map((item, idx) => (
                                        <MovieCard key={`${item.id}-${idx}`} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {popular.length > 0 && (
                            <section className="movies-section">
                                <h2 className="movies-section__title">⭐ Popular</h2>
                                <div className="movies-grid">
                                    {popular.slice(0, 20).map((item, idx) => (
                                        <MovieCard key={`${item.id}-${idx}`} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {topRated.length > 0 && (
                            <section className="movies-section">
                                <h2 className="movies-section__title">🏆 Top Rated</h2>
                                <div className="movies-grid">
                                    {topRated.slice(0, 20).map((item, idx) => (
                                        <MovieCard key={`${item.id}-${idx}`} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
