import { useEffect, useState } from "react";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api"
).replace(/\/$/, "");

export default function NotificationPanel({ onClose, onAllRead }) {
  const [notifications, setNotifications] = useState([]);
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();
  const userId = storedUser?.userId || storedUser?.id;
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    fetch(`${API_BASE_URL}/notifications?userId=${encodeURIComponent(userId)}`, { headers })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load notifications.");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setNotifications((Array.isArray(data) ? data : []).map(item => ({
          ...item,
          time: item.time || item.createdAt || '',
        })));
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markRead = (updater) => {
    setNotifications((prev) => {
      const next = updater(prev);
      if (next.every((n) => !n.isUnread)) onAllRead?.();
      return next;
    });
  };

  const markAllRead = () => {
    markRead((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    fetch(`${API_BASE_URL}/notifications/read-all?userId=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers,
    }).catch(() => {});
  };

  const markOneRead = (id) => {
    markRead((prev) => prev.map((item) => item.id === id ? { ...item, isUnread: false } : item));
    fetch(`${API_BASE_URL}/notifications/${id}/read?userId=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers,
    }).catch(() => {});
  };

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-12 z-50 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Admin announcements and system updates
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* List */}
        <div className="overflow-y-auto max-h-[420px]">
          {notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => markOneRead(n.id)}
              className={`px-6 py-4 cursor-pointer transition-colors
                ${n.isUnread ? "bg-indigo-50/60 hover:bg-indigo-50" : "hover:bg-gray-50"}
                ${i < notifications.length - 1 ? "border-b border-gray-100" : ""}
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  {/* Dot */}
                  <div className="mt-1.5 w-2 h-2 flex-shrink-0">
                    {n.isUnread && (
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm leading-snug ${n.isUnread ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs flex-shrink-0 mt-0.5 ${n.isUnread ? "text-indigo-600 font-semibold" : "text-gray-400"}`}
                >
                  {n.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100">
          <button className="w-full py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">
            View all notifications
          </button>
        </div>
      </div>
    </>
  );
}
