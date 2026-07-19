import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import { authService } from "../../services/authService";

const ShieldIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5046e5" strokeWidth="1.6">
    <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" />
    <rect x="9.5" y="11" width="5" height="4.5" rx="1" />
    <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
  </svg>
);

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get("token") || "";
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const verifyToken = async (tokenValue) => {
    const value = tokenValue.trim();
    if (!value) {
      setIsError(true);
      setMessage("Please enter the 6-digit code from your email.");
      return;
    }
    setMessage("");
    setIsError(false);
    setLoading(true);
    try {
      const data = await authService.verifyEmail(value);
      setMessage(data.message || "Email verified successfully.");
      setTimeout(() => navigate("/login"), 1600);
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Verification failed. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify khi vào từ link email (có ?token= trong URL)
  useEffect(() => {
    if (urlToken) verifyToken(urlToken);
  }, [urlToken]);

  const handleDigitChange = (index, value) => {
    // Chỉ nhận chữ số
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    // Tự động chuyển sang ô tiếp theo
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    // Auto submit khi điền đủ 6 số
    if (digit && index === 5) {
      const code = newDigits.join("");
      if (code.length === 6) verifyToken(code);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    inputRefs.current[nextEmpty]?.focus();
    if (pasted.length === 6) verifyToken(pasted);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyToken(digits.join(""));
  };

  const isComplete = digits.every((d) => d !== "");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f4f0fe" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
        <div style={{ width: "100%", maxWidth: "480px", background: "#fff", borderRadius: "24px", boxShadow: "0 20px 60px rgba(80,70,229,0.12)", overflow: "hidden" }}>
          <div style={{ height: "5px", background: "linear-gradient(90deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)" }} />

          <div style={{ padding: "44px 40px 36px" }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "rgba(99,82,229,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <ShieldIcon />
              </div>
              <p style={{ fontSize: "14px", fontWeight: "700", letterSpacing: "1.5px", color: "#5046e5", margin: "0 0 12px" }}>
                IDENTITY VERIFICATION
              </p>
              <h1 style={{ fontSize: "30px", fontWeight: "900", color: "#1a1637", margin: "0 0 14px", letterSpacing: "-0.5px" }}>
                {urlToken ? "Verifying..." : "Check your email"}
              </h1>
              {!urlToken && (
                <p style={{ fontSize: "15px", color: "#524f63", margin: 0, lineHeight: "1.6" }}>
                  We sent a 6-digit code to{" "}
                  {email
                    ? <strong style={{ color: "#1a1637" }}>{email}</strong>
                    : "your email address"
                  }
                </p>
              )}
            </div>

            {/* Form nhập mã 6 số — chỉ hiện khi không phải auto-verify từ link */}
            {!urlToken && (
              <form onSubmit={handleSubmit}>
                {/* 6 ô input tách biệt */}
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "28px" }}>
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      style={{
                        width: "52px",
                        height: "60px",
                        textAlign: "center",
                        fontSize: "24px",
                        fontWeight: "800",
                        color: "#1a1637",
                        border: `2px solid ${digit ? "#5046e5" : "#e0dbf5"}`,
                        borderRadius: "12px",
                        outline: "none",
                        background: digit ? "#f4f0fe" : "#fff",
                        transition: "all 0.15s ease",
                        cursor: "text",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#7a70e8")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = digit ? "#5046e5" : "#e0dbf5")}
                    />
                  ))}
                </div>

                {message && (
                  <p style={{ fontSize: "13px", color: isError ? "#e54545" : "#15803d", margin: "-8px 0 18px", textAlign: "center", lineHeight: "1.5" }}>
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !isComplete}
                  style={{
                    width: "100%",
                    padding: "15px",
                    borderRadius: "12px",
                    border: "none",
                    background: isComplete && !loading
                      ? "linear-gradient(135deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)"
                      : "#d8d4e8",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "700",
                    cursor: isComplete && !loading ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: isComplete && !loading ? "0 8px 24px rgba(80,70,229,0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {loading ? "Verifying..." : "Verify email"}
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </form>
            )}

            {/* Message khi auto-verify từ link */}
            {urlToken && message && (
              <p style={{ fontSize: "14px", color: isError ? "#e54545" : "#15803d", textAlign: "center", lineHeight: "1.5" }}>
                {message}
              </p>
            )}

            <p style={{ textAlign: "center", fontSize: "14px", color: "#6b6880", margin: "20px 0 0" }}>
              Didn't receive the email? Check your inbox or spam folder.
            </p>

            <div style={{ height: "1px", background: "#e8e4f5", margin: "24px 0" }} />

            <p style={{ textAlign: "center", fontSize: "14px", margin: 0 }}>
              <Link to="/login" style={{ color: "#5046e5", fontWeight: "700", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5046e5" strokeWidth="2.5">
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
