import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api"
).replace(/\/$/, "");

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderCode = params.get("order");
  const notified = useRef(false);
  const [message, setMessage] = useState("Đang xác nhận thanh toán...");

  useEffect(() => {
    if (notified.current) return;
    notified.current = true;

    const confirm = async () => {
      if (orderCode) {
        try {
          const token = localStorage.getItem("token");
          await fetch(`${API_BASE_URL}/payments/payos/status/${orderCode}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
        } catch {
          // ignore — vẫn reload tab gốc
        }
      }

      setMessage("Đang cập nhật tài khoản...");

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "PAYMENT_DONE" },
          window.location.origin
        );
      }

      setTimeout(() => window.close(), 2000);
    };

    confirm();
  }, [orderCode]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "sans-serif",
        gap: 12,
        background: "#f9fafb",
      }}
    >
      <div style={{ fontSize: 56 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", margin: 0 }}>
        {message}
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
        Tab này sẽ tự đóng sau giây lát.
      </p>
      <button
        onClick={() => window.close()}
        style={{
          marginTop: 8,
          padding: "8px 20px",
          fontSize: 13,
          border: "1px solid #d1d5db",
          borderRadius: 8,
          background: "#fff",
          cursor: "pointer",
          color: "#374151",
        }}
      >
        Đóng tab
      </button>
    </div>
  );
}
