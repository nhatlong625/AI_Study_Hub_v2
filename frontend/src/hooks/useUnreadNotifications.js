import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api"
).replace(/\/$/, "");

/**
 * Tracks whether the signed-in user has unread notifications, so the bell badge reflects the
 * server state instead of being assumed. Returns the count plus a setter the panel uses to keep
 * the badge in sync as items are marked read.
 */
export default function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();
    const userId = storedUser?.userId || storedUser?.id;
    if (!userId) { setUnreadCount(0); return; }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications?userId=${encodeURIComponent(userId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!response.ok) throw new Error("Could not load notifications.");
      const data = await response.json();
      setUnreadCount((Array.isArray(data) ? data : []).filter(item => item.isUnread).length);
    } catch {
      // A failed check must not light up the bell: showing a badge with nothing behind it is
      // worse than showing none, because the user cannot clear it.
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { unreadCount, hasUnread: unreadCount > 0, setUnreadCount, refresh };
}
