import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { authService } from "../../services/authService";

const KeyIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5046e5"
    strokeWidth="1.6"
  >
    <circle cx="8" cy="15" r="4" />
    <path d="M10.5 12.5 19 4M16 7l2 2M19 4l2 2-2 2" />
  </svg>
);

const LockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9892ab"
    strokeWidth="1.8"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ open }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9892ab"
    strokeWidth="1.8"
  >
    {open ? (
      <>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 4.22-5.07M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  // Submit new password to backend.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("Reset token is missing or invalid.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({ token, newPassword: password });
      navigate("/reset-success");
    } catch (error) {
      setMessage(error.message || "Reset failed. The link may have expired.");
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
                <KeyIcon />
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
                Set new password
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "#524f63",
                  margin: 0,
                  lineHeight: "1.6",
                }}
              >
                Your new password must be different from previously used
                passwords.
              </p>
            </div>

            {/* Form (UI only — chưa xử lý logic thật) */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1a1637",
                    marginBottom: "8px",
                  }}
                >
                  New password
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                    }}
                  >
                    <LockIcon />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 46px 13px 44px",
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
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      padding: 0,
                    }}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

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
                  Confirm new password
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                    }}
                  >
                    <LockIcon />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 46px 13px 44px",
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
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      padding: 0,
                    }}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#e54545",
                      margin: "8px 0 0",
                    }}
                  >
                    Passwords don't match or are too short (min. 8 characters)
                  </p>
                )}
                {message && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#e54545",
                      margin: "8px 0 0",
                    }}
                  >
                    {message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!passwordsMatch || loading}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "none",
                  background: passwordsMatch && !loading
                    ? "linear-gradient(135deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)"
                    : "#d8d4e8",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: passwordsMatch && !loading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: passwordsMatch && !loading
                    ? "0 8px 24px rgba(80,70,229,0.3)"
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Resetting..." : "Reset password"}
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
