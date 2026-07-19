function Card({ title, description, action, children, className = '' }) {
  return (
    <section className={['card', className].filter(Boolean).join(' ')}>
      {(title || description || action) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {description && <p className="card-description">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export default Card;
