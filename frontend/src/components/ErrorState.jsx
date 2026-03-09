import './ErrorState.css';

export default function ErrorState({ message = 'Something went wrong', onRetry, icon }) {
    return (
        <div className="error-state">
            <div className="error-state__icon">
                {icon || (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                )}
            </div>
            <p className="error-state__message">{message}</p>
            {onRetry && (
                <button className="error-state__retry" onClick={onRetry}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="23,4 23,10 17,10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                    </svg>
                    Try Again
                </button>
            )}
        </div>
    );
}
