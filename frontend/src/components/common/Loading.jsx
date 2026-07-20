function Loading({ label = 'Loading...' }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="loading-dot" />
      <span>{label}</span>
    </div>
  );
}

export default Loading;
