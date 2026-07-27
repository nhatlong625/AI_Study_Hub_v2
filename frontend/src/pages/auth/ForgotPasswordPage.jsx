import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { authService } from "../../services/authService";

const LockResetIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5046e5"
    strokeWidth="1.6"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9-3" />
    <path d="M7 7 4 4m0 3 3-3" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Request password reset from backend.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const data = await authService.forgotPassword({ email });
      setMessage(data.message || "If the email exists, a reset link has been sent.");
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f4f0fe",
      }}
    >
      <Navbar />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "#fff",
            borderRadius: "24px",
            boxShadow: "0 20px 60px rgba(80,70,229,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: "5px",
              background:
                "linear-gradient(90deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)",
            }}
          />

          <div style={{ padding: "44px 40px 36px" }}>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "20px",
                  background: "rgba(99,82,229,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <LockResetIcon />
              </div>

              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  letterSpacing: "1.5px",
                  color: "#5046e5",
                  margin: "0 0 12px",
                }}
              >
                SECURITY
              </p>
              <h1
                style={{
                  fontSize: "30px",
                  fontWeight: "900",
                  color: "#1a1637",
                  margin: "0 0 14px",
                  letterSpacing: "-0.5px",
                }}
              >
                Forgot password ?
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "#524f63",
                  margin: 0,
                  lineHeight: "1.6",
                }}
              >
                Enter your email address and we'll send you a code to reset your
                password.
              </p>
            </div>

            {/* Form (UI only — chưa xử lý submit) */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1a1637",
                    marginBottom: "8px",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    borderRadius: "12px",
                    border: "1.5px solid #e0dbf5",
                    background: "#fff",
                    fontSize: "15px",
                    color: "#1a1637",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#7a70e8")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e0dbf5")
                  }
                />
              </div>

              {message && (
                <p
                  style={{
                    fontSize: "13px",
                    color: isError ? "#e54545" : "#15803d",
                    margin: "-12px 0 18px",
                    lineHeight: "1.5",
                  }}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "none",
                  background:
                    "linear-gradient(135deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 8px 24px rgba(80,70,229,0.3)",
                }}
              >
                {loading ? "Sending..." : "Send"}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>

            <div
              style={{
                height: "1px",
                background: "#e8e4f5",
                margin: "28px 0 24px",
              }}
            />

            <p style={{ textAlign: "center", fontSize: "14px", margin: 0 }}>
              <Link
                to="/login"
                style={{
                  color: "#5046e5",
                  fontWeight: "700",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5046e5"
                  strokeWidth="2.5"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
