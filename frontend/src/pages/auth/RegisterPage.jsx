import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import logoFPT from "../../assets/logos/logo-FPT.png";
import { authService } from "../../services/authService";

const UserIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9892ab"
    strokeWidth="1.8"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#9892ab"
    strokeWidth="1.8"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 6 12 13 2 6" />
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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.69-2.26 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.14a6.6 6.6 0 0 1 0-4.28V7.02H2.18a11 11 0 0 0 0 9.96l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.02l3.66 2.84c.87-2.6 3.3-4.48 6.16-4.48z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.265-4.61-2.265-7.27 0-4.27 2.766-6.52 5.503-6.52 1.405 0 2.578.91 3.46.91.84 0 2.155-.96 3.76-.96.6 0 2.738.06 4.16 2.04-.105.07-2.518 1.47-2.518 4.43 0 3.46 3.03 4.65 3.575 4.86z" />
  </svg>
);

// Logo trường — ảnh thật từ assets/logos/logo-FPT.png
const UniversityLogo = () => (
  <div
    style={{
      width: "40px",
      height: "40px",
      borderRadius: "8px",
      background: "rgba(255,255,255,0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      overflow: "hidden",
    }}
  >
    <img
      src={logoFPT}
      alt="FPT University"
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  </div>
);

function normalizeRole(role) {
  const normalized = String(role || "").trim().toUpperCase().replace(/^ROLE_/, "");
  return normalized;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleResponse = async (response) => {
    setMessage("");
    setLoading(true);
    try {
      const data = await authService.googleLogin(response.credential);
      const user = {
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: normalizeRole(data.role),
        plan: data.plan || "Basic",
        streakDays: data.streakDays || 0,
      };
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", data.token);
      navigate(normalizeRole(data.role) === "ADMIN" ? "/admin/dashboard" : "/student/home", { replace: true });
    } catch (error) {
      setMessage(error.message || "Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /* global google */
    if (typeof google !== "undefined") {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById("google-register-btn-container"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await authService.register({ fullName, email, password });
      navigate("/verify-email", { state: { email } });
    } catch (error) {
      setMessage(error.message || "Registration failed. Please try again.");
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

      <main style={{ flex: 1, display: "flex" }}>
        {/* Left panel — marketing */}
        <div
          style={{
            flex: 1.5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 56px",
            background:
              "linear-gradient(160deg, #6352e5 0%, #4c45e5 55%, #8c84f0 100%)",
            color: "#fff",
            minWidth: "0",
          }}
        >
          <div />

          <div>
            <h1
              style={{
                fontSize: "44px",
                fontWeight: "900",
                lineHeight: "1.15",
                margin: "0 0 20px",
                letterSpacing: "-1px",
              }}
            >
              Revolutionize your learning with AI
            </h1>
            <p
              style={{
                fontSize: "17px",
                lineHeight: "1.7",
                color: "rgba(255,255,255,0.85)",
                margin: 0,
              }}
            >
              Join thousands of students using AI to summarize, analyze, and
              master their study materials in seconds. Your personal academic
              co-pilot awaits.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginTop: "36px",
              }}
            >
              {[
                "Summarize any document in seconds",
                "Ask questions and get instant answers",
                "Organize all your courses in one place",
              ].map((text) => (
                <div
                  key={text}
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="3"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <span
                    style={{ fontSize: "15px", color: "rgba(255,255,255,0.9)" }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                height: "1px",
                background: "rgba(255,255,255,0.2)",
                margin: "0 0 32px",
              }}
            />
            <p
              style={{
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "1.5px",
                color: "rgba(255,255,255,0.6)",
                margin: "0 0 16px",
              }}
            >
              TRUSTED BY STUDENTS FROM
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.08)",
                width: "fit-content",
              }}
            >
              <UniversityLogo />
              <span style={{ fontSize: "15px", fontWeight: "600" }}>
                FPT University
              </span>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 48px",
            background: "#f4f0fe",
            minWidth: "0",
          }}
        >
          <div style={{ width: "100%", maxWidth: "440px" }}>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#5046e5",
                margin: "0 0 10px",
                letterSpacing: "-0.5px",
              }}
            >
              Create your account
            </h2>
            <p
              style={{ fontSize: "15px", color: "#524f63", margin: "0 0 32px" }}
            >
              Start your journey to smarter studying today.
            </p>

            {/* Form (UI only — chưa xử lý submit) */}
            <form onSubmit={handleRegister}>
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
                  Full Name
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
                    <UserIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 16px 13px 44px",
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
              </div>

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
                  Email
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
                    <MailIcon />
                  </div>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 16px 13px 44px",
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
              </div>

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
                  Password
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

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "14px",
                  color: "#1a1637",
                  marginBottom: "28px",
                  cursor: "pointer",
                  lineHeight: "1.5",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: "#5046e5",
                    marginTop: "1px",
                    flexShrink: 0,
                  }}
                />
                <span>
                  I agree to the{" "}
                  {/* TODO: nối route Terms of Service khi đã có trang */}
                  <Link
                    to="#"
                    style={{
                      color: "#5046e5",
                      fontWeight: "600",
                      textDecoration: "none",
                    }}
                  >
                    Terms of Service
                  </Link>{" "}
                  and {/* TODO: nối route Privacy Policy khi đã có trang */}
                  <Link
                    to="#"
                    style={{
                      color: "#5046e5",
                      fontWeight: "600",
                      textDecoration: "none",
                    }}
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {message && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#e54545",
                    margin: "-16px 0 18px",
                  }}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={!agreed || loading}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  border: "none",
                  background: agreed && !loading
                    ? "linear-gradient(135deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)"
                    : "#d8d4e8",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: agreed && !loading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: agreed && !loading ? "0 8px 24px rgba(80,70,229,0.3)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Creating account..." : "Create account"}
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
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "28px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "#e8e4f5" }} />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  color: "#9892ab",
                }}
              >
                OR CONTINUE WITH
              </span>
              <div style={{ flex: 1, height: "1px", background: "#e8e4f5" }} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              <div style={{ position: "relative", display: "flex", flex: 1 }}>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1.5px solid #e0dbf5",
                    background: "#fff",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#1a1637",
                    cursor: "pointer",
                    pointerEvents: "none",
                  }}
                >
                  <GoogleIcon />
                  Google
                </button>
                <div
                  id="google-register-btn-container"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                />
              </div>
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1.5px solid #e0dbf5",
                  background: "#fff",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "#1a1637",
                  cursor: "pointer",
                }}
              >
                <AppleIcon />
                Apple
              </button>
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "14px",
                color: "#6b6880",
                margin: 0,
              }}
            >
              Already have an account ?{" "}
              <Link
                to="/login"
                style={{
                  color: "#5046e5",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
