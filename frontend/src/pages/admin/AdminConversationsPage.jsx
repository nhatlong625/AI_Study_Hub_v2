import { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS = [
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#dcfce7", text: "#15803d" },
  { bg: "#fef9c3", text: "#a16207" },
  { bg: "#ffe4e6", text: "#be123c" },
  { bg: "#e0f2fe", text: "#0369a1" },
];

function getAvatarColor(name) {
  const idx = (name || "").charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ name, size = 40 }) {
  const initials = (name || "??").replace(/\s+/g, "").substring(0, 2).toUpperCase();
  const { bg, text } = getAvatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await adminService.getConversations();
        setConversations(data);
      } catch (err) {
        setError(err.message || "Could not load conversations.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const selectConversation = async (conv) => {
    setSelected(conv);
    setMessages([]);
    setIsLoadingMessages(true);
    try {
      const data = await adminService.getConversationMessages(conv.id);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = conversations.filter((c) => c.active).length;

  return (
    <div className="conv-page">
      {/* Header */}
      <div className="conv-header">
        <div>
          <h1 className="conv-title">AI Tutor Conversations</h1>
          <p className="conv-subtitle">View all user conversations with the AI Tutor</p>
        </div>
        <div className="conv-header-badge">
          <span className="conv-active-dot" />
          {activeCount} active
        </div>
      </div>

      {error && <div className="conv-error">{error}</div>}

      {/* Split View */}
      <div className="conv-split">
        {/* Left — Conversation List */}
        <div className="conv-list-panel">
          <div className="conv-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="conv-search-icon">
              <circle cx="11" cy="11" r="8" stroke="#8c8a9e" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" stroke="#8c8a9e" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              className="conv-search-input"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="conv-list">
            {isLoading ? (
              <div className="conv-empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="conv-empty">No conversations found.</div>
            ) : (
              filtered.map((conv) => (
                <div
                  key={conv.id}
                  className={`conv-list-item${selected?.id === conv.id ? " conv-list-item--active" : ""}`}
                  onClick={() => selectConversation(conv)}
                >
                  <Avatar name={conv.name} size={42} />
                  <div className="conv-item-body">
                    <div className="conv-item-top">
                      <span className="conv-item-name">{conv.name}</span>
                      <span className="conv-item-time">{timeAgo(conv.lastTime)}</span>
                    </div>
                    <div className="conv-item-top">
                      <span className="conv-item-preview">
                        {(conv.lastMessage || "").length > 45
                          ? conv.lastMessage.substring(0, 45) + "..."
                          : conv.lastMessage}
                      </span>
                      {conv.active && <span className="conv-active-dot" />}
                    </div>
                    <div className="conv-item-meta">
                      <span className="conv-item-email">{conv.email}</span>
                      <span className="conv-item-count">{conv.messageCount} messages</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Message Detail */}
        <div className="conv-detail-panel">
          {!selected ? (
            <div className="conv-detail-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#c4c0d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className="conv-detail-header">
                <Avatar name={selected.name} size={40} />
                <div className="conv-detail-info">
                  <div className="conv-detail-name">
                    {selected.name}
                    {selected.active && <span className="conv-badge-active">Active</span>}
                  </div>
                  <div className="conv-detail-email">{selected.email}</div>
                </div>
                <div className="conv-detail-title-wrap">
                  <span className="conv-detail-session-title">{selected.title}</span>
                  <span className="conv-detail-msg-count">{selected.messageCount} messages</span>
                </div>
              </div>

              <div className="conv-messages">
                {isLoadingMessages ? (
                  <div className="conv-empty">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="conv-empty">No messages in this conversation.</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`conv-msg conv-msg--${msg.role === "user" ? "user" : "ai"}`}>
                      {msg.role !== "user" && (
                        <div className="conv-msg-avatar conv-msg-avatar--ai">AI</div>
                      )}
                      <div className="conv-msg-bubble">
                        <div className="conv-msg-content">{msg.content}</div>
                        <div className="conv-msg-time">{formatTime(msg.createdAt)}</div>
                      </div>
                      {msg.role === "user" && <Avatar name={selected.name} size={32} />}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
