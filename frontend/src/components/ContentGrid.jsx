import ContentCard from './ContentCard';
import './ContentGrid.css';

export default function ContentGrid({ title, items = [], emptyMessage = 'No content available' }) {
    return (
        <section className="content-grid">
            {title && (
                <div className="content-grid__header">
                    <h2 className="content-grid__title">{title}</h2>
                    <div className="content-grid__line" />
                </div>
            )}
            {items.length > 0 ? (
                <div className="content-grid__items">
                    {items.map((item) => (
                        <ContentCard key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="content-grid__empty">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </section>
    );
}
