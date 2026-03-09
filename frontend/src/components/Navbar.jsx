import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import tmdbService from '../services/tmdbService';
import animeService from '../services/animeService';
import './Navbar.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const searchRef = useRef(null);
    const debounceRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Debounced search suggestions — uses TMDB + AnimeVerse
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const [tmdbRes, animeRes] = await Promise.allSettled([
                    tmdbService.search(searchQuery),
                    animeService.suggest(searchQuery),
                ]);

                const movieItems = (tmdbRes.status === 'fulfilled' ? tmdbRes.value?.results || [] : [])
                    .slice(0, 4)
                    .map(item => ({
                        id: item.tmdbId || item.id,
                        title: item.title,
                        image: item.poster,
                        type: item.contentType || item.type || 'movie',
                        _type: 'movie',
                        link: `/info/${item.type === 'tv' ? 'tv' : 'movie'}/${item.tmdbId || item.id}`,
                    }));

                const animeItems = [];
                if (animeRes.status === 'fulfilled') {
                    const data = animeRes.value;
                    const items = data?.data?.items || data?.results || [];
                    items.slice(0, 4).forEach(item => {
                        animeItems.push({
                            id: item.id,
                            title: item.title,
                            image: item.image,
                            type: 'anime',
                            _type: 'anime',
                            link: `/anime/info/${item.id}`,
                        });
                    });
                }

                const merged = [...movieItems, ...animeItems].slice(0, 8);
                setSuggestions(merged);
                if (merged.length > 0) setShowSuggestions(true);
            } catch (_) { }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    // Close suggestions on outside click
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setShowSuggestions(false);
            setMobileSearchOpen(false);
            setSearchQuery('');
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar__container">
                <Link to="/" className="navbar__logo">
                    <span className="navbar__logo-icon">🎬</span>
                    <span className="navbar__logo-text">Movies4Hub</span>
                </Link>

                <div className="navbar__links">
                    <Link to="/" className="navbar__link">Home</Link>
                    <Link to="/movies" className="navbar__link">Movies</Link>
                    <Link to="/anime" className="navbar__link">Anime</Link>
                    <Link to="/search" className="navbar__link">Search</Link>
                    <Link to="/credits" className="navbar__link">Credits</Link>
                </div>

                {/* ─── Search Bar ─── */}
                <div className={`navbar__search ${mobileSearchOpen ? 'navbar__search--open' : ''}`} ref={searchRef}>
                    <form onSubmit={handleSearchSubmit} className="navbar__search-form">
                        <svg className="navbar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className="navbar__search-input"
                            placeholder="Search movies, anime, series..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            id="global-search"
                        />
                        {searchQuery && (
                            <button type="button" className="navbar__search-clear" onClick={() => { setSearchQuery(''); setSuggestions([]); }}>
                                ✕
                            </button>
                        )}
                    </form>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="navbar__suggestions">
                            {suggestions.map((item) => (
                                <Link
                                    key={`${item._type}-${item.id}`}
                                    to={item.link}
                                    className="navbar__suggestion"
                                    onClick={() => { setShowSuggestions(false); setSearchQuery(''); setMobileSearchOpen(false); }}
                                >
                                    {item.image && <img src={item.image} alt="" className="navbar__suggestion-img" />}
                                    <div className="navbar__suggestion-info">
                                        <span className="navbar__suggestion-title">{item.title}</span>
                                        <span className="navbar__suggestion-type">{item.type}</span>
                                    </div>
                                </Link>
                            ))}
                            <button className="navbar__suggestion-all" onClick={handleSearchSubmit}>
                                View all results for "{searchQuery}"
                            </button>
                        </div>
                    )}
                </div>

                <div className="navbar__actions">
                    <button className="navbar__search-mobile-btn" onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                    <ThemeToggle />
                    {user ? (
                        <div className="navbar__user">
                            <Link to="/dashboard" className="navbar__user-btn">
                                <span className="navbar__avatar">{user.username?.[0]?.toUpperCase() || 'U'}</span>
                            </Link>
                            <button className="navbar__logout" onClick={handleLogout}>Logout</button>
                        </div>
                    ) : (
                        <div className="navbar__auth">
                            <Link to="/login" className="navbar__btn navbar__btn--ghost">Sign In</Link>
                            <Link to="/register" className="navbar__btn navbar__btn--primary">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
