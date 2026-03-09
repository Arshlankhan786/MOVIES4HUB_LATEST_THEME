import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import animeService from '../services/animeService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import './AnimeInfo.css';

export default function AnimeInfo() {
    const { id } = useParams();
    const [info, setInfo] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [activeSeason, setActiveSeason] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        animeService.getInfo(id)
            .then((response) => {
                const data = response?.data || response;
                if (data && data.success !== false && data.title) {
                    setInfo(data);
                    if (data.seasons?.length > 0) setActiveSeason(data.seasons[0]);
                    if (data.episodesList) setEpisodes(data.episodesList);
                } else {
                    setError(data?.error || 'Content not found');
                }
            })
            .catch(() => setError('Failed to load content'))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!info || info.type === 'movie') return;
        animeService.getEpisodes(id, activeSeason)
            .then((data) => {
                if (data?.episodes) setEpisodes(data.episodes);
            })
            .catch(() => { });
    }, [id, activeSeason, info]);

    if (loading) return <LoadingSpinner fullPage message="Loading content..." />;
    if (error) return <div className="anime-info anime-info--error"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>;
    if (!info) return <div className="anime-info anime-info--error"><ErrorState message="Content not found" /></div>;

    const bg = info.background || info.image?.replace('/w500/', '/w1280/');

    return (
        <div className="anime-info">
            <div className="anime-info__backdrop" style={{ backgroundImage: `url(${bg})` }}>
                <div className="anime-info__backdrop-overlay" />
            </div>

            <div className="anime-info__container">
                <div className="anime-info__header">
                    <div className="anime-info__poster">
                        <img src={info.image} alt={info.title} />
                    </div>
                    <div className="anime-info__details">
                        <h1 className="anime-info__title">{info.title}</h1>
                        <div className="anime-info__meta">
                            {info.type && <span className="anime-info__tag">{info.type}</span>}
                            {info.year && <span className="anime-info__tag">{info.year}</span>}
                            {info.duration && <span className="anime-info__tag">{info.duration}</span>}
                            {info.episodes && <span className="anime-info__tag">{info.episodes} Episodes</span>}
                        </div>
                        {info.genres && (
                            <div className="anime-info__genres">
                                {info.genres.map((g, i) => (
                                    <Link key={`genre-${i}`} to={`/anime/category/genre/${g.toLowerCase().replace(/\s+/g, '-')}`} className="anime-info__genre">{g}</Link>
                                ))}
                            </div>
                        )}
                        {info.languages && (
                            <div className="anime-info__langs">
                                {info.languages.map((l, i) => (
                                    <span key={`lang-${i}`} className="anime-info__lang">{l}</span>
                                ))}
                            </div>
                        )}
                        {info.description && <p className="anime-info__desc">{info.description}</p>}
                        {info.type === 'movie' && (
                            <Link to={`/anime/watch/${id}`} className="anime-info__watch-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                Watch Now
                            </Link>
                        )}
                    </div>
                </div>

                {info.type !== 'movie' && info.seasons?.length > 0 && (
                    <div className="anime-info__seasons">
                        <h2 className="anime-info__section-title">Seasons</h2>
                        <div className="anime-info__season-tabs">
                            {info.seasons.map((s) => (
                                <button key={`s-${s}`} className={`anime-info__season-tab ${s === activeSeason ? 'active' : ''}`} onClick={() => setActiveSeason(s)}>
                                    Season {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {info.type !== 'movie' && episodes.length > 0 && (
                    <div className="anime-info__episodes">
                        <h2 className="anime-info__section-title">Episodes — Season {activeSeason}</h2>
                        <div className="anime-info__episodes-grid">
                            {episodes.map((ep, i) => (
                                <Link key={ep.id || `ep-${i}`} to={`/anime/watch/${ep.id || `${id}-${activeSeason}x${i + 1}`}`} className="anime-info__episode">
                                    {ep.image && <img src={ep.image} alt={ep.title || `EP ${i + 1}`} className="anime-info__ep-img" />}
                                    <div className="anime-info__ep-info">
                                        <span className="anime-info__ep-num">EP {ep.episode || i + 1}</span>
                                        <span className="anime-info__ep-title">{ep.title || `Episode ${i + 1}`}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {info.recommended?.length > 0 && (
                    <div className="anime-info__recommended">
                        <h2 className="anime-info__section-title">Recommended</h2>
                        <div className="anime-info__rec-grid">
                            {info.recommended.map((item, i) => (
                                <Link key={item.id || `rec-${i}`} to={`/anime/info/${item.id}`} className="anime-info__rec-card">
                                    <img src={item.image} alt={item.title} />
                                    <span className="anime-info__rec-title">{item.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
