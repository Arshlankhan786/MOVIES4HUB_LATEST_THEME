import './Credits.css';

export default function Credits() {
    return (
        <div className="credits-page">
            <div className="credits-container">

                {/* ─── Header ─── */}
                <div className="credits-header">
                    <span className="credits-header__icon">🎬</span>
                    <h1 className="credits-header__title">Credits</h1>
                    <p className="credits-header__subtitle">
                        Acknowledging the open-source projects and technologies that power Movies4Hub.
                    </p>
                </div>

                {/* ─── API Credits ─── */}
                <section className="credits-section">
                    <h2 className="credits-section__title">
                        <span className="credits-section__icon">🌐</span>
                        Integrated APIs
                    </h2>
                    <div className="credits-cards">
                        <div className="credits-card">
                            <div className="credits-card__badge">Movie API</div>
                            <p className="credits-card__text">
                                An open-source movie data API powering our movie catalog, metadata, and search functionality.
                                Maintained by its respective developers and community contributors.
                            </p>
                        </div>
                        <div className="credits-card">
                            <div className="credits-card__badge">Anime API</div>
                            <p className="credits-card__text">
                                An open-source anime data API providing our anime catalog, episode data, and streaming metadata.
                                Maintained by its respective developers and community contributors.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ─── Tech Stack ─── */}
                <section className="credits-section">
                    <h2 className="credits-section__title">
                        <span className="credits-section__icon">⚡</span>
                        Technology Stack
                    </h2>
                    <div className="credits-tech-grid">
                        {[
                            { name: 'React', desc: 'Frontend Framework' },
                            { name: 'Vite', desc: 'Build Tool' },
                            { name: 'Node.js', desc: 'Runtime Environment' },
                            { name: 'Express', desc: 'Backend Framework' },
                            { name: 'MySQL', desc: 'Database' },
                            { name: 'Redis', desc: 'Cache Layer' },
                        ].map((tech) => (
                            <div key={tech.name} className="credits-tech-item">
                                <span className="credits-tech-item__name">{tech.name}</span>
                                <span className="credits-tech-item__desc">{tech.desc}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── Legal Disclaimer ─── */}
                <section className="credits-legal" id="legal-disclaimer">
                    <div className="credits-legal__header">
                        <svg className="credits-legal__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <h2 className="credits-legal__title">Legal Disclaimer</h2>
                    </div>

                    <div className="credits-legal__body">
                        <p className="credits-legal__statement">
                            Movies4Hub is an educational and research-based project.
                        </p>

                        <p className="credits-legal__text">
                            All integrated APIs (Movie API and Anime API) are open-source projects created and
                            maintained by their respective developers.
                        </p>

                        <p className="credits-legal__text">
                            This platform does not host, store, or distribute copyrighted media files on its own
                            servers.
                        </p>

                        <p className="credits-legal__text">
                            Movies4Hub only integrates publicly available open-source APIs for learning and
                            technical demonstration purposes.
                        </p>

                        <div className="credits-legal__divider" />

                        <p className="credits-legal__text">
                            Users are solely responsible for how they use this platform. Any misuse, illegal
                            streaming, or copyright violations performed by users are strictly their own
                            responsibility.
                        </p>

                        <p className="credits-legal__text">
                            The developers and contributors of Movies4Hub are not liable for any misuse, damages,
                            or legal consequences arising from user actions.
                        </p>

                        <p className="credits-legal__text">
                            All trademarks, media content, and intellectual property belong to their respective
                            owners.
                        </p>
                    </div>

                    <div className="credits-legal__footer">
                        <span className="credits-legal__copyright">
                            © {new Date().getFullYear()} Movies4Hub — All rights reserved.
                        </span>
                    </div>
                </section>

            </div>
        </div>
    );
}
