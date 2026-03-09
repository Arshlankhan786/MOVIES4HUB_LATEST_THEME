import './SkeletonCard.css';

export function SkeletonCard({ count = 1 }) {
    return Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
            <div className="skeleton-card__poster skeleton-pulse" />
            <div className="skeleton-card__info">
                <div className="skeleton-card__title skeleton-pulse" />
                <div className="skeleton-card__sub skeleton-pulse" />
            </div>
        </div>
    ));
}

export function SkeletonRow() {
    return (
        <div className="skeleton-row">
            <div className="skeleton-row__header">
                <div className="skeleton-row__title skeleton-pulse" />
            </div>
            <div className="skeleton-row__scroll">
                <SkeletonCard count={8} />
            </div>
        </div>
    );
}

export function SkeletonHero() {
    return (
        <div className="skeleton-hero skeleton-pulse">
            <div className="skeleton-hero__content">
                <div className="skeleton-hero__badge skeleton-pulse" />
                <div className="skeleton-hero__title skeleton-pulse" />
                <div className="skeleton-hero__meta">
                    <div className="skeleton-hero__tag skeleton-pulse" />
                    <div className="skeleton-hero__tag skeleton-pulse" />
                </div>
                <div className="skeleton-hero__btns">
                    <div className="skeleton-hero__btn skeleton-pulse" />
                    <div className="skeleton-hero__btn skeleton-pulse" />
                </div>
            </div>
        </div>
    );
}
