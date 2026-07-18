import { NavLink } from 'react-router-dom';

function ChatHistoryItem({ thread }) {
  return (
    <NavLink 
      to={`/student/ai-tutor/chat/${thread.id}`}
      className={({ isActive }) => `list-item ${isActive ? 'active' : ''}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}
    >
      <span className="list-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <strong style={{ display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {thread.title}
        </strong>
        <div className="muted" style={{ fontSize: '0.8rem' }}>{thread.updatedAt}</div>
      </div>
    </NavLink>
  );
}

export default ChatHistoryItem;
