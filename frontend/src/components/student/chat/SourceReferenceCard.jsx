function SourceReferenceCard({ source, onClick }) {
  const label = typeof source === 'string'
    ? source
    : source?.documentName || source?.document_name || source?.title || 'Source document';

  return (
    <div
      title={label}
      onClick={() => onClick?.(source)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.(source);
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.8rem',
        marginTop: '8px',
        cursor: 'pointer',
        maxWidth: '260px'
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

export default SourceReferenceCard;
