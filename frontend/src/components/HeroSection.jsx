import { Link } from 'react-router-dom';
import './HeroSection.css';

export default function HeroSection({ featured }) {
    if (!featured) {
        return (
            <section className="hero">
                <div className="hero__content">
                    <h1 className="hero__title">
                        Welcome to <span className="hero__brand">Movies4Hub</span>
                    </h1>
                    <p className="hero__subtitle">
                        Stream unlimited movies and anime in HD quality. Your ultimate entertainment destination.
                    </p>
                    <div className="hero__actions">
                        <Link to="/movies" className="hero__btn hero__btn--primary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                            Browse Movies
                        </Link>
                        <Link to="/anime" className="hero__btn hero__btn--secondary">
                            Explore Anime
                        </Link>
                    </div>
                </div>
                <div className="hero__overlay" />
            </section>
        );
    }

    return (
        <section
            className="hero hero--featured"
            style={{ backgroundImage: featured.backdrop ? `url(${featured.backdrop})` : 'none' }}
        >
            <div className="hero__overlay" />
            <div className="hero__content">
                <span className="hero__badge">⭐ Featured</span>
                <h1 className="hero__title">{featured.title}</h1>
                <p className="hero__subtitle">{featured.description}</p>
                <div className="hero__meta">
                    {featured.quality && <span className="hero__tag">{featured.quality}</span>}
                    {featured.type && <span className="hero__tag">{featured.type.toUpperCase()}</span>}
                </div>
                <div className="hero__actions">
                    <Link to={`/watch/${featured.id}`} className="hero__btn hero__btn--primary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                        Watch Now
                    </Link>
                    <Link to={`/content/${featured.id}`} className="hero__btn hero__btn--secondary">
                        Details
                    </Link>
                </div>
            </div>
        </section>
    );
}
