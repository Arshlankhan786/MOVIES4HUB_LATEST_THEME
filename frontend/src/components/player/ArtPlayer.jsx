/**
 * frontend/components/player/ArtPlayer.jsx
 *
 * BUG FIXES applied in this version:
 *  1. STALE CLOSURE in handleFallback — activeServerIdx was captured at
 *     useEffect creation time (always 0). When an HLS error fired later
 *     the fallback always saw index 0 and could only increment to 1, then
 *     to 1 again on next failure. Fixed: use a mutable ref (serverIdxRef)
 *     that is kept in sync with the state.
 *  2. switchQuality — art.switchQuality() is synchronous in ArtPlayer v5
 *     and does NOT return a Promise. Calling .then() on its return value
 *     threw a silent TypeError. Fixed: wrap in Promise.resolve().
 *  3. Minor: destroy existing art instance before re-initialising to prevent
 *     double-mounting on React StrictMode.
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

const UI_ICONS = {
    play:  '<svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
};

function ArtPlayer({ providers, subtitles = [], poster = '', uniqueId = 'default', autoPlay = true }) {
    const artRef        = useRef(null);
    const containerRef  = useRef(null);

    const [activeServerIdx, setActiveServerIdx] = useState(0);
    const [errorMSG, setErrorMSG]               = useState('');

    // ── CRITICAL FIX: Keep a mutable ref in sync with state so that
    //    callbacks (HLS error handlers, art.on('error')) always read the
    //    CURRENT index instead of the stale closure value.
    const serverIdxRef = useRef(0);
    useEffect(() => {
        serverIdxRef.current = activeServerIdx;
    }, [activeServerIdx]);

    // Valid providers with at least one source
    const validProviders = providers.filter(p => p.sources && p.sources.length > 0);

    useEffect(() => {
        if (!validProviders.length || !containerRef.current) return;

        // Destroy any previous instance first (handles React StrictMode double-invoke)
        if (artRef.current) {
            artRef.current.destroy(false);
            artRef.current = null;
        }

        const currentServer = validProviders[activeServerIdx];
        if (!currentServer) return;

        // Prefer 1080p, fall back to first source
        const currentSource =
            currentServer.sources.find(s => String(s.quality).includes('1080')) ||
            currentServer.sources[0];

        // Fix double-slash that can appear in proxified CDN URLs
        const cleanUrl = (url) =>
            url.replace(
                'https://movies4hub-movie-api-production.up.railway.app//',
                'https://movies4hub-movie-api-production.up.railway.app/'
            );

        const initUrl = cleanUrl(currentSource.url);

        // Quality selector
        const qualitySelector = currentServer.sources.map(s => {
            const label = String(s.quality).toUpperCase().includes('P')
                ? String(s.quality)
                : `${s.quality}P`;
            return {
                default: s.url === currentSource.url,
                html:    label,
                url:     cleanUrl(s.url),
            };
        });

        // ── Fallback handler — reads from ref, NOT from closure ───────────────
        // FIXED: was `if (activeServerIdx < validProviders.length - 1)`
        //        which always used the stale captured value.
        const handleFallback = () => {
            const currentIdx = serverIdxRef.current;
            if (currentIdx < validProviders.length - 1) {
                if (artRef.current) {
                    artRef.current.notice.show = 'Stream failed, switching server...';
                }
                setActiveServerIdx(currentIdx + 1);
            } else {
                if (artRef.current) {
                    artRef.current.notice.show = 'All servers failed.';
                }
                setErrorMSG('All sources failed to load.');
            }
        };

        let art;
        try {
            art = new Artplayer({
                container:        containerRef.current,
                url:              initUrl,
                poster,
                volume:           1,
                isLive:           false,
                muted:            false,
                autoplay:         autoPlay,
                autoOrientation:  true,
                pip:              true,
                autoSize:         true,
                autoMini:         true,
                screenshot:       true,
                setting:          true,
                loop:             false,
                flip:             true,
                playbackRate:     true,
                aspectRatio:      true,
                fullscreen:       true,
                fullscreenWeb:    true,
                subtitleOffset:   true,
                miniProgressBar:  true,
                mutex:            true,
                backdrop:         true,
                playsInline:      true,
                autoPlayback:     true,
                airplay:          true,
                theme:            '#e50914',
                icons: {
                    state:     UI_ICONS.play,
                    indicator: UI_ICONS.play,
                },
                settings: [
                    {
                        html:    'Quality',
                        width:   150,
                        tooltip: String(currentSource.quality).toUpperCase().includes('P')
                            ? String(currentSource.quality)
                            : `${currentSource.quality}P`,
                        selector: qualitySelector,
                        // FIXED: switchQuality in ArtPlayer v5 is synchronous;
                        //        wrapping in Promise.resolve() makes it safe
                        //        regardless of internal implementation changes.
                        onSelect(item) {
                            const savedTime = art.currentTime;
                            Promise.resolve(art.switchQuality(item.url)).then(() => {
                                art.currentTime = savedTime;
                            }).catch(() => {
                                // switchQuality failed — silently ignore
                            });
                            return item.html;
                        },
                    },
                ],
                subtitle: {
                    url:      subtitles.find(s => s.default)?.url || subtitles[0]?.url || '',
                    type:     'vtt',
                    style:    { color: '#fff', fontSize: '24px', textShadow: '1px 1px 2px #000' },
                    encoding: 'utf-8',
                },
                customType: {
                    m3u8(video, url, artObj) {
                        if (Hls.isSupported()) {
                            if (artObj.hls) artObj.hls.destroy();

                            const hls = new Hls({ xhrSetup(xhr) { xhr.withCredentials = false; } });
                            hls.loadSource(url);
                            hls.attachMedia(video);
                            artObj.hls = hls;
                            artObj.on('destroy', () => hls.destroy());

                            hls.on(Hls.Events.ERROR, (_, data) => {
                                if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                    handleFallback();
                                }
                            });
                        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                            video.src = url;
                        } else {
                            artObj.notice.show = 'Unsupported video format';
                        }
                    },
                },
            });

            artRef.current = art;

            // Mobile double-tap gesture
            let lastTap = 0;
            art.template.$video.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTap < 300) {
                    const rect = art.template.$video.getBoundingClientRect();
                    const x    = e.changedTouches[0].clientX - rect.left;
                    if (x < rect.width / 2) {
                        art.currentTime = Math.max(art.currentTime - 10, 0);
                        showSkip('skip-left', art.template.$player);
                    } else {
                        art.currentTime = Math.min(art.currentTime + 10, art.duration);
                        showSkip('skip-right', art.template.$player);
                    }
                }
                lastTap = now;
            });

            // Resume watch progress from localStorage
            art.on('ready', () => {
                const saved = localStorage.getItem(uniqueId);
                if (saved && parseFloat(saved) > 5) {
                    art.currentTime = parseFloat(saved);
                }
            });

            // Save watch progress
            art.on('video:timeupdate', () => {
                if (art.currentTime > 10) {
                    localStorage.setItem(uniqueId, art.currentTime);
                }
            });

            // General error fallback
            art.on('error', () => handleFallback());

        } catch (err) {
            console.error('[ArtPlayer] init error:', err);
        }

        return () => {
            if (artRef.current) {
                artRef.current.destroy(false);
                artRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [validProviders, activeServerIdx, uniqueId, poster, subtitles, autoPlay]);

    // ── Server switch (external button) ────────────────────────────────────────
    const handleServerSwitch = useCallback((idx) => {
        if (idx === serverIdxRef.current) return;

        const savedTime = artRef.current ? artRef.current.currentTime : 0;
        if (savedTime > 0) localStorage.setItem(uniqueId, savedTime);

        setActiveServerIdx(idx);
    }, [uniqueId]);

    // ── Skip indicator helper ────────────────────────────────────────────────
    function showSkip(side, container) {
        if (!container) return;
        const el = document.createElement('div');
        el.textContent = side === 'skip-left' ? '⏪ 10s' : '10s ⏩';
        Object.assign(el.style, {
            position:        'absolute',
            top:             '50%',
            [side === 'skip-left' ? 'left' : 'right']: '15%',
            transform:       'translateY(-50%)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color:           '#fff',
            padding:         '10px 20px',
            borderRadius:    '20px',
            fontSize:        '18px',
            pointerEvents:   'none',
            zIndex:          '999',
            opacity:         '0',
            transition:      'opacity 0.2s',
        });
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '1'; }, 10);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 200);
        }, 600);
    }

    // ── No streams ────────────────────────────────────────────────────────────
    if (validProviders.length === 0) {
        return (
            <div style={{
                width: '100%', aspectRatio: '16/9', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#000', color: '#fff', borderRadius: '8px',
            }}>
                <h2>No streams available currently.</h2>
            </div>
        );
    }

    return (
        <div className="artplayer-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Player container */}
            <div
                ref={containerRef}
                style={{
                    width: '100%', aspectRatio: '16/9',
                    backgroundColor: '#000', borderRadius: '8px',
                    overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                }}
            />

            {/* Server selector */}
            <div className="artplayer-server-selector" style={{
                marginTop: '1rem', display: 'flex', flexWrap: 'wrap',
                gap: '10px', alignItems: 'center',
            }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Server
                </span>
                {validProviders.map((prov, idx) => (
                    <button
                        key={prov.name}
                        onClick={() => handleServerSwitch(idx)}
                        style={{
                            padding:    '8px 16px',
                            background: idx === activeServerIdx ? '#e50914' : '#1f1f1f',
                            color:      '#fff',
                            border:     idx === activeServerIdx ? '1px solid #e50914' : '1px solid #333',
                            borderRadius: '4px',
                            cursor:     'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            boxShadow:  idx === activeServerIdx ? '0 0 10px rgba(229,9,20,0.4)' : 'none',
                        }}
                    >
                        {prov.label || prov.name}
                    </button>
                ))}
            </div>

            {errorMSG && (
                <div style={{ color: '#ff4d4d', marginTop: '10px', fontSize: '0.9rem' }}>
                    {errorMSG}
                </div>
            )}
        </div>
    );
}

export default memo(ArtPlayer);