import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import searchApiService from '../services/searchApiService';
import useDebounce from '../hooks/useDebounce';
import SEOHead from '../components/SEOHead';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonCard } from '../components/SkeletonCard';
import './Search.css';

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';
    const typeFilter = searchParams.get('type') || '';
    const yearFilter = searchParams.get('year') || '';

    const [inputValue, setInputValue] = useState(query);
    const [results, setResults] = useState({ results: [], total: 0 });
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const debouncedInput = useDebounce(inputValue, 400);

    // Update URL when debounced input changes
    useEffect(() => {
        if (debouncedInput && debouncedInput !== query) {
            const params = new URLSearchParams(searchParams);
            params.set('q', debouncedInput);
            setSearchParams(params, { replace: true });
        }
    }, [debouncedInput]);

    // Fetch results when query changes
    useEffect(() => {
        if (!query) {
            setLoading(false);
            setResults({ results: [], total: 0 });
            searchApiService.getTrending().then(setTrending);
            return;
        }

        setLoading(true);
        setError('');

        searchApiService.search(query, { type: typeFilter, year: yearFilter })
            .then((data) => {
                setResults(data);
            })
            .catch(() => setError('Search failed'))
            .finally(() => setLoading(false));
    }, [query, typeFilter, yearFilter]);

    // Load trending on mount
    useEffect(() => {
        searchApiService.getTrending().then(setTrending);
    }, []);

    // Unified results array
    const allResults = results.results || [];

    function getLink(item) {
        if (item.type === 'anime' || item.contentType === 'anime') {
            return `/anime/info/${item.id}`;
        }
        if (item.type === 'tv' || item.contentType === 'series') {
            return `/info/tv/${item.tmdbId || item.id}`;
        }
        return `/info/movie/${item.tmdbId || item.id}`;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            const params = new URLSearchParams();
            params.set('q', inputValue.trim());
            if (typeFilter) params.set('type', typeFilter);
            if (yearFilter) params.set('year', yearFilter);
            setSearchParams(params);
        }
    };

    return (
        <div className="search-page">
            <SEOHead
                title={query ? `Search: ${query}` : 'Search'}
                description={`Search movies and anime on Movies4Hub${query ? ` - Results for "${query}"` : ''}`}
            />
            <div className="search-container">
                {/* Search Bar */}
                <form className="search-bar" onSubmit={handleSubmit}>
                    <div className="search-input-wrap">
                        <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            id="unified-search-input"
                            type="text"
                            placeholder="Search movies, anime, TV shows..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                        />
                        {inputValue && (
                            <button type="button" className="search-clear" onClick={() => { setInputValue(''); setSearchParams({}); }}>
                                ✕
                            </button>
                        )}
                    </div>
                    {/* Filters */}
                    <div className="search-filters">
                        <select
                            id="search-type-filter"
                            value={typeFilter}
                            onChange={(e) => {
                                const params = new URLSearchParams(searchParams);
                                if (e.target.value) params.set('type', e.target.value);
                                else params.delete('type');
                                setSearchParams(params);
                            }}
                        >
                            <option value="">All Types</option>
                            <option value="anime">Anime</option>
                            <option value="movie">Movies</option>
                            <option value="series">Series</option>
                        </select>
                        <select
                            id="search-year-filter"
                            value={yearFilter}
                            onChange={(e) => {
                                const params = new URLSearchParams(searchParams);
                                if (e.target.value) params.set('year', e.target.value);
                                else params.delete('year');
                                setSearchParams(params);
                            }}
                        >
                            <option value="">All Years</option>
                            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </form>

                {/* Trending (when no query) */}
                {!query && trending.length > 0 && (
                    <div className="search-trending">
                        <h3>🔥 Trending Searches</h3>
                        <div className="trending-tags">
                            {trending.map(t => (
                                <button
                                    key={t.query}
                                    className="trending-tag"
                                    onClick={() => { setInputValue(t.query); setSearchParams({ q: t.query }); }}
                                >
                                    {t.query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {query && (
                    <h1 className="search-header">
                        {loading ? 'Searching...' : (
                            <>Results for "<span className="search-query">{query}</span>" ({allResults.length})</>
                        )}
                    </h1>
                )}

                {loading ? (
                    <div className="search-grid">
                        <SkeletonCard count={12} />
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={() => window.location.reload()} />
                ) : query && allResults.length === 0 ? (
                    <EmptyState
                        title={`No results for "${query}"`}
                        message="Try different keywords or browse categories"
                        icon={
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        }
                    />
                ) : query && allResults.length > 0 ? (
                    <div className="search-grid">
                        {allResults.map((item, idx) => {
                            const link = getLink(item);
                            const displayType = item.type === 'tv' ? 'series' : item.type || item.contentType || 'movie';
                            return (
                                <Link key={`${item.id}-${idx}`} to={link} className="search-card">
                                    <div className="search-card__poster">
                                        {(item.poster || item.image) ? (
                                            <img src={item.poster || item.image} alt={item.title || item.name} loading="lazy" />
                                        ) : (
                                            <div className="search-card__no-img">🎬</div>
                                        )}
                                        <div className="search-card__overlay">
                                            <div className="search-card__play">▶</div>
                                        </div>
                                        <span className="search-card__type">{displayType}</span>
                                    </div>
                                    <h3 className="search-card__title">{item.title || item.name}</h3>
                                </Link>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
