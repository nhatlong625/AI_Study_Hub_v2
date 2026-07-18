function SuggestedPromptCard({ title, description, icon, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        border: '1px solid var(--border)', 
        borderRadius: '8px', 
        padding: '16px', 
        cursor: 'pointer',
        background: 'var(--surface)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
      className="hover-lift"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
        {icon}
        <span>{title}</span>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {description}
      </div>
    </div>
  );
}

export default SuggestedPromptCard;
