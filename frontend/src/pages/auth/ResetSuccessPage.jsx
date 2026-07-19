import { Link } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

const CheckIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6352e5"
    strokeWidth="3"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const CelebrationStyles = () => (
  <style>{`
    @keyframes iconPopIn {
      0% { transform: scale(0); opacity: 0; }
      55% { transform: scale(1.15); opacity: 1; }
      75% { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    @keyframes ringPulse {
      0% { transform: scale(0.8); opacity: 0.6; }
      100% { transform: scale(1.8); opacity: 0; }
    }
    .reset-success-ring {
      animation: ringPulse 1.2s ease-out both;
    }
    .reset-success-icon {
      animation: iconPopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
  `}</style>
);

export default function ResetSuccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f4f0fe",
      }}
    >
      <CelebrationStyles />
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

          <div style={{ padding: "48px 40px 36px", textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                width: "88px",
                height: "88px",
                margin: "0 auto 28px",
              }}
            >
              <span
                className="reset-success-ring"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "24px",
                  border: "2px solid #8c84f0",
                  animationDelay: "0.4s",
                }}
              />
              <span
                className="reset-success-ring"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "24px",
                  border: "2px solid #8c84f0",
                  animationDelay: "0.6s",
                }}
              />

              <div
                className="reset-success-icon"
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(135deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 12px 28px rgba(80,70,229,0.3)",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckIcon />
                </div>
              </div>
            </div>

            <h1
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#1a1637",
                margin: "0 0 14px",
                letterSpacing: "-0.5px",
              }}
            >
              Success !
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#524f63",
                margin: "0 0 32px",
                lineHeight: "1.6",
              }}
            >
              Your password has been changed. Please log in again with your new
              password.
            </p>

            <Link
              to="/login"
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #6352e5 0%, #4c45e5 60%, #8c84f0 100%)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "700",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 8px 24px rgba(80,70,229,0.3)",
                boxSizing: "border-box",
              }}
            >
              Back to sign in
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
            </Link>

            <div
              style={{
                height: "1px",
                background: "#e8e4f5",
                margin: "28px 0 20px",
              }}
            />

            <p style={{ fontSize: "14px", color: "#6b6880", margin: 0 }}>
              Need help ?{" "}
              {/* TODO: nối route Contact Support khi đã có trang */}
              <Link
                to="#"
                style={{
                  color: "#5046e5",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
