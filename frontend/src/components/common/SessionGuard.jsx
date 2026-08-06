import React, { useState, useEffect, useCallback } from "react";
import AccountDeletedModal from "./AccountDeletedModal";
import { API_BASE_URL } from "../../config/api";

export default function SessionGuard({ children }) {
  // null = phiên bình thường. "expired" = token hết hạn/thiếu. "deleted" = tài khoản không còn.
  const [sessionIssue, setSessionIssue] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    setSessionIssue(null);
    window.location.href = "/login";
  }, []);

  // "deleted" nghiêm trọng hơn nên không bị "expired" ghi đè.
  const triggerSessionIssue = useCallback((reason) => {
    setSessionIssue((prev) => (prev === "deleted" ? prev : reason));
  }, []);

  // 1. Intercept fetch 401 responses when user is logged in
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Bám vào "user" chứ không phải "token": khi token bị mất hoặc bị xóa thủ công
      // thì user vẫn tưởng mình đang đăng nhập, và đó chính là lúc cần báo rõ nhất.
      const loggedIn = Boolean(localStorage.getItem("user"));
      if (loggedIn && response.status === 401) {
        // Exclude login / auth endpoints from triggering the session modal
        const urlStr = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (!urlStr.includes("/auth/login") && !urlStr.includes("/auth/register")) {
          triggerSessionIssue("expired");
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [triggerSessionIssue]);

  // 2. Periodically verify user session with backend.
  // 60s thay vì 5s: mốc 5s tạo ~17.000 request/ngày cho mỗi tab đang mở mà
  // gần như không đổi trải nghiệm. Bù lại bằng một lần kiểm tra ngay khi user
  // quay lại tab - đó mới là lúc phiên có khả năng đã hết hạn.
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr || sessionIssue) return;

      try {
        let user;
        try { user = JSON.parse(userStr); } catch { return; }
        const userId = user?.userId ?? user?.id;
        if (!userId) return;

        const res = await fetch(`${API_BASE_URL}/users/${userId}/plan`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // 404 = user không còn trong DB. 401 = token không dùng được nữa.
        if (res.status === 404) {
          triggerSessionIssue("deleted");
        } else if (res.status === 401) {
          triggerSessionIssue("expired");
        }
      } catch (err) {
        // Ignore network failure errors during periodic check
      }
    };

    const intervalId = setInterval(checkSession, 60000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [sessionIssue, triggerSessionIssue]);

  return (
    <>
      {children}
      {sessionIssue && (
        <AccountDeletedModal onLogout={handleLogout} reason={sessionIssue} />
      )}
    </>
  );
}
