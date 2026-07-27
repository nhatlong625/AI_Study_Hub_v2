import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { renderMessageContent } from '../../components/student/chat/ChatMessage';

function initials(name) {
  return String(name || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('vi-VN');
}

export default function AdminConversationHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedId = searchParams.get('id');

  useEffect(() => {
    adminService.getConversations()
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setConversations(items);
        if (!selectedId && items.length > 0) {
          setSearchParams({ id: String(items[0].id) }, { replace: true });
        }
      })
      .catch((err) => setError(err.message || 'Could not load conversations.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    setDetailLoading(true);
    setError('');
    adminService.getConversation(selectedId)
      .then(setSelected)
      .catch((err) => setError(err.message || 'Could not load this conversation.'))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) =>
      [item.title, item.userName, item.userEmail, item.preview]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    );
  }, [conversations, search]);

  return (
    <div className="admin-conversations-page">
      <div className="admin-conversations-heading">
        <div>
          <h1 className="as-page-title">Chat History</h1>
          <p>Read-only view of user conversations with AI Tutor.</p>
        </div>
        <span className="admin-readonly-badge">Read only</span>
      </div>

      {error && <div className="admin-conversations-error">{error}</div>}

      <div className="admin-conversations-shell">
        <aside className="admin-conversations-list">
          <div className="admin-conversations-search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user or conversation..."
              aria-label="Search conversations"
            />
          </div>
          <div className="admin-conversations-scroll">
            {loading ? (
              <div className="admin-conversations-empty">Loading conversations...</div>
            ) : filtered.length === 0 ? (
              <div className="admin-conversations-empty">No conversations found.</div>
            ) : filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-conversation-row ${String(item.id) === selectedId ? 'active' : ''}`}
                onClick={() => setSearchParams({ id: String(item.id) })}
              >
                <span className="admin-conversation-avatar">{initials(item.userName)}</span>
                <span className="admin-conversation-copy">
                  <span className="admin-conversation-user">
                    <strong>{item.userName}</strong>
                    <time>{formatDate(item.updatedAt)}</time>
                  </span>
                  <span className="admin-conversation-title">{item.title || 'Untitled conversation'}</span>
                  <span className="admin-conversation-preview">{item.preview || 'No messages yet.'}</span>
                  <span className="admin-conversation-count">{item.messageCount || 0} messages</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-conversation-detail">
          {detailLoading ? (
            <div className="admin-conversations-empty">Loading messages...</div>
          ) : !selected ? (
            <div className="admin-conversations-empty">Select a conversation to read.</div>
          ) : (
            <>
              <header className="admin-conversation-detail-header">
                <div>
                  <h2>{selected.title || 'Untitled conversation'}</h2>
                  <p>{selected.userName} - {selected.userEmail}</p>
                </div>
                <span>{formatDate(selected.updatedAt || selected.createdAt)}</span>
              </header>
              <div className="admin-conversation-messages">
                {(selected.messages || []).length === 0 ? (
                  <div className="admin-conversations-empty">This conversation has no messages.</div>
                ) : (selected.messages || []).map((message) => {
                  const role = String(message.role || '').toLowerCase();
                  const isUser = role === 'user';
                  return (
                    <article key={message.id} className={`admin-chat-message ${isUser ? 'user' : 'assistant'}`}>
                      <div className="admin-chat-message-meta">
                        <strong>{isUser ? selected.userName : 'AI Tutor'}</strong>
                        <time>{formatDate(message.createdAt)}</time>
                      </div>
                      <div className="admin-chat-message-content">
                        {renderMessageContent(message.content)}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
