function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">AI</div>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
      {action}
    </div>
  );
}

export default EmptyState;
