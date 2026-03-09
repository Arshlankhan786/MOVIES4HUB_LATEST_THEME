/**
 * SEO Head Component — injects JSON-LD, OpenGraph, Twitter meta tags.
 */
import { useEffect } from 'react';

const SITE_NAME = 'Movies4Hub';

function setMeta(name, content) {
    let el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        if (name.startsWith('og:') || name.startsWith('twitter:')) {
            el.setAttribute('property', name);
        } else {
            el.setAttribute('name', name);
        }
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function setJsonLd(data) {
    let script = document.querySelector('#jsonld-seo');
    if (!script) {
        script = document.createElement('script');
        script.id = 'jsonld-seo';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
}

export default function SEOHead({ title, description, image, url, type = 'website', jsonLd = null }) {
    useEffect(() => {
        // Title
        document.title = title ? `${title} - ${SITE_NAME}` : SITE_NAME;

        // Meta description
        setMeta('description', description || `Watch movies and anime for free on ${SITE_NAME}`);

        // OpenGraph
        setMeta('og:title', title || SITE_NAME);
        setMeta('og:description', description || `Stream movies and anime on ${SITE_NAME}`);
        setMeta('og:type', type);
        setMeta('og:site_name', SITE_NAME);
        if (image) setMeta('og:image', image);
        if (url) setMeta('og:url', url);

        // Twitter
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', title || SITE_NAME);
        setMeta('twitter:description', description || `Stream movies and anime on ${SITE_NAME}`);
        if (image) setMeta('twitter:image', image);

        // JSON-LD
        if (jsonLd) {
            setJsonLd(jsonLd);
        }

        return () => {
            // Cleanup on unmount
            document.title = SITE_NAME;
        };
    }, [title, description, image, url, type, jsonLd]);

    return null; // This is a side-effect only component
}

export function slugify(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
