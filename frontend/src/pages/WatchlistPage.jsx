import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import watchlistService from '../services/watchlistService';
import SEOHead from '../components/SEOHead';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import './Watchlist.css';

export default function WatchlistPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        watchlistService.getAll(page, 20)
            .then(res => {
                setItems(res.data || []);
                setPagination(res.pagination || {});
            })
            .finally(() => setLoading(false));
    }, [user, page]);

    const handleRemove = async (contentId, type) => {
        await watchlistService.toggle(contentId, type);
        setItems(prev => prev.filter(i => !(i.content_id === contentId && i.type === type)));
    };

    if (!user) {
        return (
            <div className="watchlist-page">
                <div className="watchlist-container">
                    <EmptyState title="Login Required" message="Please log in to view your watchlist" />
                </div>
            </div>
        );
    }

    return (
        <div className="watchlist-page">
            <SEOHead title="My Watchlist" description="Your saved movies and anime" />
            <div className="watchlist-container">
                <h1 className="watchlist-title">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    My Watchlist
                </h1>

                {loading ? (
                    <LoadingSpinner />
                ) : items.length === 0 ? (
                    <EmptyState
                        title="Watchlist is empty"
                        message="Save movies and anime to watch later"
                        icon={
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                        }
                    />
                ) : (
                    <>
                        <div className="watchlist-grid">
                            {items.map((item) => (
                                <div key={item.id} className="watchlist-card">
                                    <Link
                                        to={item.type === 'anime' ? `/anime/info/${item.content_id}` : `/info/${item.content_id}`}
                                        className="watchlist-card__link"
                                    >
                                        <div className="watchlist-card__poster">
                                            <div className="watchlist-card__no-img">🎬</div>
                                            <div className="watchlist-card__overlay">
                                                <div className="watchlist-card__play">▶</div>
                                            </div>
                                            <span className="watchlist-card__type">{item.type}</span>
                                        </div>
                                        <h3 className="watchlist-card__title">{item.content_id}</h3>
                                    </Link>
                                    <button
                                        className="watchlist-remove-btn"
                                        onClick={() => handleRemove(item.content_id, item.type)}
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="watchlist-pagination">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="pagination-btn"
                                >
                                    ← Prev
                                </button>
                                <span className="pagination-info">
                                    Page {page} of {pagination.totalPages}
                                </span>
                                <button
                                    disabled={page >= pagination.totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="pagination-btn"
                                >
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
