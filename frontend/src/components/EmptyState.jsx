import './EmptyState.css';

export default function EmptyState({ title = 'Nothing here yet', message, icon }) {
    return (
        <div className="empty-state">
            <div className="empty-state__icon">
                {icon || (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <polyline points="16,3 12,7 8,3" />
                    </svg>
                )}
            </div>
            <h3 className="empty-state__title">{title}</h3>
            {message && <p className="empty-state__message">{message}</p>}
        </div>
    );
}
