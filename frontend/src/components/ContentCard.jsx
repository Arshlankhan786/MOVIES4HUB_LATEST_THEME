import { Link } from 'react-router-dom';
import './ContentCard.css';

export default function ContentCard({ item }) {
    return (
        <Link to={`/watch/${item.id}`} className="content-card" id={`content-card-${item.id}`}>
            <div className="content-card__poster">
                {item.poster ? (
                    <img src={item.poster} alt={item.title} loading="lazy" />
                ) : (
                    <div className="content-card__placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)" opacity="0.3">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                    </div>
                )}
                <div className="content-card__overlay">
                    <div className="content-card__play">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21" /></svg>
                    </div>
                </div>
                {item.quality && <span className="content-card__quality">{item.quality}</span>}
                {item.type && <span className="content-card__type">{item.type}</span>}
            </div>
            <div className="content-card__info">
                <h3 className="content-card__title">{item.title}</h3>
            </div>
        </Link>
    );
}
