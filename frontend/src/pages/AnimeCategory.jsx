import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import animeService from '../services/animeService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { SkeletonCard } from '../components/SkeletonCard';
import './AnimeCategory.css';

export default function AnimeCategory() {
    const { type } = useParams();
    const location = useLocation();
    const resolvedType = type || (location.pathname.includes('/movies') ? 'movies' : 'anime');
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const categoryTitle = resolvedType
        .replace(/\//g, ' › ')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    const fetchData = useCallback(() => {
        setLoading(true);
        setError('');
        animeService.getCategory(resolvedType, page)
            .then((data) => {
                if (data?.success && data?.data?.items) {
                    setItems(data.data.items);
                    setTotalPages(data.totalPages || 1);
                } else if (data?.success === false) {
                    setError(data.error || 'Failed to load category');
                } else {
                    setItems([]);
                }
            })
            .catch(() => setError('Failed to load'))
            .finally(() => setLoading(false));
    }, [resolvedType, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="category-page">
            <div className="category-container">
                <h1 className="category-title">{categoryTitle}</h1>

                {loading ? (
                    <div className="category-grid">
                        <SkeletonCard count={18} />
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={fetchData} />
                ) : items.length === 0 ? (
                    <EmptyState title="No content found" message="Try a different category" />
                ) : (
                    <>
                        <div className="category-grid">
                            {items.map((item, idx) => (
                                <Link key={`${item.id}-${idx}`} to={`/anime/info/${item.id}`} className="category-card">
                                    <div className="category-card__poster">
                                        <img src={item.image} alt={item.title} loading="lazy" />
                                        <div className="category-card__overlay">
                                            <div className="category-card__play">▶</div>
                                        </div>
                                        {item.type && <span className="category-card__type">{item.type}</span>}
                                    </div>
                                    <h3 className="category-card__title">{item.title}</h3>
                                </Link>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="category-pagination">
                                <button className="category-pagination__btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                    ← Previous
                                </button>
                                <span className="category-pagination__info">Page {page} of {totalPages}</span>
                                <button className="category-pagination__btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
