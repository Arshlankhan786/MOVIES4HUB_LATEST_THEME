import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'md', message, fullPage = false }) {
    const cls = `spinner spinner--${size} ${fullPage ? 'spinner--fullpage' : ''}`;

    return (
        <div className={cls}>
            <div className="spinner__ring" />
            {message && <p className="spinner__message">{message}</p>}
        </div>
    );
}
