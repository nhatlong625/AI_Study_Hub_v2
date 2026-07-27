import { Link } from "react-router-dom";
import heroImac from "../../assets/images/hero-imac.png";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

// ── Icons ──
const SparkleIcon = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 C12 2 13 7 16 10 C19 11 22 12 22 12 C22 12 19 13 16 14 C13 17 12 22 12 22 C12 22 11 17 8 14 C5 13 2 12 2 12 C2 12 5 11 8 10 C11 7 12 2 12 2Z" />
  </svg>
);
const FileIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const LockIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const DocIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const CloudUpIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ── Hero ──
function Hero() {
  return (
    <section style={{ textAlign: "center", padding: "80px 24px 60px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 18px",
          borderRadius: "99px",
          border: "1.5px solid rgba(99,82,229,0.4)",
          background: "rgba(99,82,229,0.12)",
          fontSize: "15px",
          fontWeight: "700",
          color: "#5046e5",
          marginBottom: "32px",
        }}
      >
        <SparkleIcon style={{ width: 15, height: 15 }} />
        Powered by advanced AI technology
      </div>

      <h1
        style={{
          fontSize: "clamp(32px, 5vw, 58px)",
          fontWeight: "900",
          lineHeight: "1.12",
          color: "#1a1637",
          margin: "0 auto 24px",
          maxWidth: "820px",
          letterSpacing: "-1.5px",
        }}
      >
        FSTUDY: The AI Document Assistant for{" "}
        <span style={{ color: "#5046e5" }}>Modern Students</span>
      </h1>

      <p
        style={{
          fontSize: "18px",
          color: "#524f63",
          lineHeight: "1.7",
          maxWidth: "540px",
          margin: "0 auto 40px",
        }}
      >
        Store, manage, and extract insights from your study materials with the
        power of artificial intelligence.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/register"
          style={{
            padding: "17px 42px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #6352e5 0%, #4c45e5 100%)",
            color: "#fff",
            fontSize: "17px",
            fontWeight: "700",
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(80,70,229,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(80,70,229,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(80,70,229,0.3)";
          }}
        >
          Get Started
        </Link>
        <button
          style={{
            padding: "17px 38px",
            borderRadius: "14px",
            background: "#fff",
            border: "1.5px solid #e0dbf5",
            color: "#1a1637",
            fontSize: "17px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 0 0 rgba(0,0,0,0)",
            transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#a89be8";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(99,82,229,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e0dbf5";
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
          }}
        >
          Watch Demo
        </button>
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: "960px",
          margin: "64px auto 0",
        }}
      >
        {/* Floating card */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            left: "-60px",
            zIndex: 20,
            background: "#fff",
            borderRadius: "20px",
            padding: "12px 20px",
            boxShadow: "0 8px 28px rgba(80,70,229,0.14)",
            border: "1px solid #ede9fb",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#ede9fd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5046e5",
            }}
          >
            <FileIcon />
          </div>
          <div>
            <div
              style={{ fontSize: "11px", color: "#9896a8", fontWeight: "500" }}
            >
              Summary Ready
            </div>
            <div
              style={{ fontSize: "13px", fontWeight: "700", color: "#1a1637" }}
            >
              Philosophy_Notes.pdf
            </div>
          </div>
        </div>

        {/* Floating badge bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "-20px",
            right: "-40px",
            zIndex: 20,
            background: "linear-gradient(135deg, #6352e5, #4c45e5)",
            borderRadius: "99px",
            padding: "14px 22px",
            boxShadow: "0 8px 24px rgba(80,70,229,0.35)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          ✦ Analyzing 50+ documents...
        </div>

        {/* White border wrapper */}
        <div
          style={{
            borderRadius: "24px",
            padding: "12px",
            background: "#fff",
            boxShadow: "0 24px 60px rgba(80,70,229,0.15)",
          }}
        >
          <img
            src={heroImac}
            alt="FStudy app on iMac"
            style={{ width: "100%", display: "block", borderRadius: "16px" }}
          />
        </div>
      </div>
    </section>
  );
}

// ── Network graph ──
const NetworkGraphIllustration = () => (
  <svg
    width="260"
    height="220"
    viewBox="0 0 180 160"
    fill="none"
    style={{
      position: "absolute",
      right: "-10px",
      bottom: "-10px",
      opacity: 0.9,
    }}
  >
    <line x1="90" y1="80" x2="40" y2="40" stroke="#c4b9f5" strokeWidth="2" />
    <line x1="90" y1="80" x2="150" y2="40" stroke="#c4b9f5" strokeWidth="2" />
    <line x1="90" y1="80" x2="30" y2="120" stroke="#c4b9f5" strokeWidth="2" />
    <line x1="90" y1="80" x2="155" y2="115" stroke="#c4b9f5" strokeWidth="2" />
    <line x1="90" y1="80" x2="90" y2="148" stroke="#c4b9f5" strokeWidth="2" />
    <circle
      cx="90"
      cy="80"
      r="22"
      fill="#e8e3fc"
      stroke="#b8aef2"
      strokeWidth="2"
    />
    <circle cx="90" cy="80" r="13" fill="#c4b9f5" />
    {[
      [40, 40],
      [150, 40],
      [30, 120],
      [155, 115],
      [90, 148],
    ].map(([cx, cy], i) => (
      <g key={i}>
        <circle
          cx={cx}
          cy={cy}
          r="16"
          fill="#edeafd"
          stroke="#c4b9f5"
          strokeWidth="1.5"
        />
        <circle cx={cx} cy={cy} r="9" fill="#d4ccf8" />
      </g>
    ))}
  </svg>
);

// ── Team illustration ──
const TeamIllustration = () => (
  <div style={{ position: "relative", width: "160px", height: "130px" }}>
    <svg
      width="160"
      height="130"
      viewBox="0 0 160 130"
      style={{ position: "relative", zIndex: 1 }}
    >
      <circle cx="35" cy="35" r="14" fill="#fbbf24" />
      <rect x="20" y="52" width="30" height="45" rx="6" fill="#f59e0b" />
      <rect x="18" y="95" width="12" height="30" rx="4" fill="#fbbf24" />
      <rect x="30" y="95" width="12" height="30" rx="4" fill="#fbbf24" />
      <rect x="44" y="75" width="28" height="18" rx="3" fill="#6366f1" />
      <rect x="40" y="93" width="36" height="3" rx="1.5" fill="#4f46e5" />
      <circle cx="85" cy="28" r="14" fill="#fb923c" />
      <rect x="70" y="45" width="30" height="48" rx="6" fill="#ea580c" />
      <rect x="68" y="91" width="12" height="32" rx="4" fill="#fb923c" />
      <rect x="80" y="91" width="12" height="32" rx="4" fill="#fb923c" />
      <circle cx="130" cy="35" r="14" fill="#fbbf24" />
      <rect x="115" y="52" width="30" height="45" rx="6" fill="#d97706" />
      <rect x="113" y="95" width="12" height="28" rx="4" fill="#fbbf24" />
      <rect x="125" y="95" width="12" height="28" rx="4" fill="#fbbf24" />
      <rect x="90" y="78" width="28" height="18" rx="3" fill="#8b5cf6" />
      <rect x="86" y="96" width="36" height="3" rx="1.5" fill="#7c3aed" />
      <rect
        x="55"
        y="15"
        width="60"
        height="38"
        rx="5"
        fill="#312e81"
        stroke="#6366f1"
        strokeWidth="1"
      />
      <rect x="59" y="19" width="52" height="30" rx="3" fill="#1e1b4b" />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x="62"
          y={23 + i * 8}
          width={i === 0 ? 30 : i === 1 ? 44 : 22}
          height="4"
          rx="2"
          fill="#6366f1"
          opacity="0.8"
        />
      ))}
    </svg>
  </div>
);

// ── Feature Card ──
function FeatureCard({ children, style = {} }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "20px",
        border: "1px solid rgba(99,82,229,0.1)",
        boxShadow: "0 2px 12px rgba(99,82,229,0.06)",
        overflow: "hidden",
        position: "relative",
        transition: "box-shadow 0.2s, transform 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(80,70,229,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(99,82,229,0.06)";
        e.currentTarget.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}

const iconBox = (bg, color) => ({
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  background: bg,
  color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "24px",
});

// ── Features ──
function Features() {
  return (
    <section style={{ padding: "80px 48px 100px" }}>
      <div style={{ margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <h2
            style={{
              fontSize: "38px",
              fontWeight: "900",
              color: "#1a1637",
              margin: "0 0 12px",
              letterSpacing: "-0.8px",
            }}
          >
            Comprehensive Academic Ecosystem
          </h2>
          <p style={{ fontSize: "16px", color: "#524f63", margin: 0 }}>
            Core modules designed for efficiency and results
          </p>
        </div>

        {/* Row 1 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <FeatureCard>
            <div style={{ padding: "36px", minHeight: "240px" }}>
              <div style={iconBox("#edeafd", "#4f46e5")}>
                <SparkleIcon />
              </div>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#1a1637",
                  margin: "0 0 12px",
                }}
              >
                AI Chatbot Integration
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b6880",
                  lineHeight: "1.75",
                  margin: "0 0 20px",
                  maxWidth: "52%",
                }}
              >
                Query your documents directly. Our intelligent assistant
                extracts key concepts, generates summaries, and answers specific
                questions from your library.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                {["#SmartQuery", "#AutoSummary"].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "5px 14px",
                      borderRadius: "99px",
                      background: "#edeafd",
                      color: "#4f46e5",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <NetworkGraphIllustration />
            </div>
          </FeatureCard>

          <FeatureCard>
            <div style={{ padding: "36px" }}>
              <div style={iconBox("#edeafd", "#4f46e5")}>
                <LockIcon />
              </div>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#1a1637",
                  margin: "0 0 12px",
                }}
              >
                Identity & Access
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b6880",
                  lineHeight: "1.75",
                  margin: 0,
                }}
              >
                Secure authentication and granular access controls. Keep your
                private research data protected with industry-standard
                encryption.
              </p>
            </div>
          </FeatureCard>
        </div>

        {/* Row 2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: "20px",
          }}
        >
          {/* Document Management */}
          <FeatureCard>
            <div style={{ padding: "36px" }}>
              <div style={iconBox("#edeafd", "#4f46e5")}>
                <DocIcon />
              </div>
              <h3
                style={{
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#1a1637",
                  margin: "0 0 12px",
                }}
              >
                Document Management
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b6880",
                  lineHeight: "1.75",
                  margin: 0,
                }}
              >
                Organize PDF, DOCX, and slides with smart tagging and instant
                full-text search across your entire academic collection.
              </p>
            </div>
          </FeatureCard>

          {/* Cloud Storage — ảnh trái + text phải trong 1 card */}
          <FeatureCard>
            <div
              style={{ display: "flex", height: "100%", minHeight: "280px" }}
            >
              <div
                style={{
                  width: "42%",
                  flexShrink: 0,
                  background:
                    "linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #1a1040 100%)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "16px 0 16px 16px",
                }}
              >
                <TeamIllustration />
              </div>
              <div
                style={{
                  padding: "36px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={iconBox("#edeafd", "#4f46e5")}>
                  <CloudUpIcon />
                </div>
                <h3
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    color: "#1a1637",
                    margin: "0 0 12px",
                  }}
                >
                  Cloud Storage & Preview
                </h3>
                <p
                  style={{
                    fontSize: "15px",
                    color: "#6b6880",
                    lineHeight: "1.75",
                    margin: "0 0 20px",
                  }}
                >
                  Access your library from any device. Seamless in-browser
                  previews ensure you never need to download a file just to
                  check its content.
                </p>
                <a
                  href="#"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#5046e5",
                    textDecoration: "none",
                  }}
                >
                  Learn more <ArrowRightIcon />
                </a>
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

// ── CTA ──
function CTABanner() {
  return (
    <>
      <section style={{ padding: "0 48px 100px" }}>
        <div style={{ margin: "0 auto" }}>
          <div
            style={{
              borderRadius: "28px",
              padding: "80px 48px",
              textAlign: "center",
              background:
                "linear-gradient(135deg, #5d54ea 0%, #4338ca 60%, #3730a3 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-60px",
                right: "-60px",
                width: "280px",
                height: "280px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-80px",
                left: "-40px",
                width: "220px",
                height: "220px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
              }}
            />
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#fff",
                margin: "0 0 16px",
                lineHeight: "1.2",
                letterSpacing: "-0.5px",
              }}
            >
              Elevate your learning experience today
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.8)",
                margin: "0 auto 40px",
                lineHeight: "1.6",
                fontWeight: "400",
                whiteSpace: "nowrap",
              }}
            >
              Join thousands of students who are transforming how they manage
              knowledge.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/register"
                style={{
                  padding: "14px 32px",
                  borderRadius: "14px",
                  background: "#fff",
                  color: "#4338ca",
                  fontSize: "15px",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                Start Free Trial
              </Link>
              <button
                style={{
                  padding: "14px 32px",
                  borderRadius: "14px",
                  background: "transparent",
                  border: "2px solid rgba(255,255,255,0.4)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.8)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")
                }
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Footer ──

export default function FeaturesPage() {
  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "#f4f0fe",
        minHeight: "100vh",
      }}
    >
      <Navbar />
      <Hero />
      <Features />
      <CTABanner />
      <Footer />
    </div>
  );
}
