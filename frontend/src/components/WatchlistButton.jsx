/**
 * Watchlist Button Component — toggle bookmark with animation.
 */
import { useState } from 'react';
import useWatchlist from '../hooks/useWatchlist';
import './WatchlistButton.css';

export default function WatchlistButton({ contentId, type, size = 'medium' }) {
    const { inWatchlist, toggle, loading } = useWatchlist(contentId, type);

    if (!contentId || !type) return null;

    return (
        <button
            id={`watchlist-btn-${type}-${contentId}`}
            className={`watchlist-btn ${size} ${inWatchlist ? 'active' : ''} ${loading ? 'loading' : ''}`}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(); }}
            disabled={loading}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
            <svg
                className="watchlist-icon"
                viewBox="0 0 24 24"
                fill={inWatchlist ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
            >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {size !== 'small' && (
                <span className="watchlist-text">
                    {loading ? '...' : inWatchlist ? 'Saved' : 'Watchlist'}
                </span>
            )}
        </button>
    );
}
