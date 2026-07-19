import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

// ── Icons ──
const SparkleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2 C12 2 13 7 16 10 C19 11 22 12 22 12 C22 12 19 13 16 14 C13 17 12 22 12 22 C12 22 11 17 8 14 C5 13 2 12 2 12 C2 12 5 11 8 10 C11 7 12 2 12 2Z" />
  </svg>
);
const RocketIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);
const ShieldIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const DocIcon = () => (
  <svg
    width="32"
    height="32"
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
const CheckIcon = () => (
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
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const PlusIcon = () => (
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
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ExternalIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ── Hero ──
function Hero() {
  return (
    <div style={{ textAlign: "center", padding: "80px 48px 60px" }}>
      <h1
        style={{
          fontSize: "42px",
          fontWeight: "900",
          color: "#1a1637",
          margin: "0 0 16px",
          lineHeight: 1.15,
          letterSpacing: "-1px",
        }}
      >
        How can we help you today ?
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#524f63",
          lineHeight: "1.7",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        Explore our comprehensive guides and documentation to master FSTUDY and
        supercharge your learning journey.
      </p>
    </div>
  );
}

// ── Guide Cards ──
function GuideCards() {
  return (
    <div style={{ padding: "0 48px", margin: "0 auto 80px" }}>
      {/* Row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Getting Started — rocket inside card */}
        <div
          style={{
            background: "#f8f7ff",
            borderRadius: "20px",
            border: "1px solid rgba(99,82,229,0.1)",
            boxShadow: "0 2px 12px rgba(99,82,229,0.06)",
            padding: "32px",
            position: "relative",
            overflow: "hidden",
            minHeight: "280px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "18px",
              background: "#edeafd",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <RocketIcon />
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#1a1637",
              margin: "0 0 16px",
            }}
          >
            Getting Started
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "55%",
            }}
          >
            {[
              "Creating your first AI-assisted workspace",
              "Connecting your academic accounts",
              "Touring the FSTUDY dashboard",
            ].map((item) => (
              <div
                key={item}
                style={{
                  fontSize: "15px",
                  color: "#6b6880",
                  lineHeight: "1.5",
                }}
              >
                {item}
              </div>
            ))}
          </div>
          {/* Rocket illustration inside card */}
          <div
            style={{
              position: "absolute",
              right: "16px",
              top: "16px",
              bottom: "16px",
              width: "40%",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="140" height="180" viewBox="0 0 140 180">
              {[20, 50, 90, 120, 155].map((y, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={y}
                  x2="140"
                  y2={y}
                  stroke="#4f46e5"
                  strokeWidth="0.4"
                  opacity="0.3"
                />
              ))}
              {[20, 50, 80, 110, 130].map((x, i) => (
                <line
                  key={i}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="180"
                  stroke="#4f46e5"
                  strokeWidth="0.4"
                  opacity="0.3"
                />
              ))}
              <rect
                x="25"
                y="110"
                width="90"
                height="52"
                rx="5"
                fill="#1a1a3e"
                stroke="#4f46e5"
                strokeWidth="1"
              />
              <rect
                x="30"
                y="115"
                width="80"
                height="42"
                rx="3"
                fill="#0d0d2b"
              />
              <rect
                x="33"
                y="118"
                width="74"
                height="36"
                rx="2"
                fill="#1e1b4b"
              />
              {[0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x="37"
                  y={123 + i * 9}
                  width={i === 0 ? 45 : i === 1 ? 60 : 35}
                  height="5"
                  rx="2"
                  fill="#6366f1"
                  opacity="0.7"
                />
              ))}
              <ellipse cx="70" cy="72" rx="15" ry="26" fill="#6366f1" />
              <polygon points="70,28 57,50 83,50" fill="#4f46e5" />
              <ellipse cx="70" cy="72" rx="7" ry="9" fill="#a5b4fc" />
              <polygon points="55,78 44,100 57,88" fill="#4338ca" />
              <polygon points="85,78 96,100 83,88" fill="#4338ca" />
              <ellipse
                cx="70"
                cy="100"
                rx="7"
                ry="11"
                fill="#f59e0b"
                opacity="0.9"
              />
              <ellipse cx="70" cy="102" rx="4" ry="7" fill="#fbbf24" />
              {[
                [15, 15],
                [120, 25],
                [10, 80],
                [125, 70],
                [20, 145],
                [118, 140],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="#a5b4fc"
                  opacity="0.7"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* AI Chatbot Tips */}
        <div
          style={{
            background: "linear-gradient(135deg, #6352e5 0%, #4f46e5 100%)",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 8px 32px rgba(80,70,229,0.3)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.25)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <SparkleIcon />
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#fff",
              margin: "0 0 16px",
            }}
          >
            AI Chatbot Tips
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            {[
              "Prompting for deep analysis",
              "Summarizing 50+ page docs",
              "Citing sources with AI",
            ].map((item) => (
              <div
                key={item}
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.8)",
                  lineHeight: "1.5",
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.2)",
              paddingTop: "20px",
            }}
          >
            <a
              href="#"
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#fff",
                textDecoration: "none",
                letterSpacing: "0.5px",
              }}
            >
              VIEW PLAYBOOK ↗
            </a>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* Document Management */}
        <div
          style={{
            background: "#f8f7ff",
            borderRadius: "20px",
            border: "1px solid rgba(99,82,229,0.1)",
            boxShadow: "0 2px 12px rgba(99,82,229,0.06)",
            padding: "32px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              background: "#5046e5",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "700",
              padding: "4px 10px",
              borderRadius: "99px",
            }}
          >
            New Update
          </div>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "18px",
              background: "#edeafd",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <DocIcon />
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#1a1637",
              margin: "0 0 20px",
            }}
          >
            Document Management
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {[
              { title: "Bulk Upload Guide", sub: "PDF, DOCX, and more" },
              { title: "Smart OCR Scan", sub: "Digitize handwritten notes" },
              { title: "Cloud Sync", sub: "Drive & Dropbox setup" },
              { title: "Version Control", sub: "History and recovery" },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#1a1637",
                    marginBottom: "4px",
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: "13px", color: "#9896a8" }}>
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Privacy */}
        <div
          style={{
            background: "#f8f7ff",
            borderRadius: "20px",
            border: "1px solid rgba(99,82,229,0.1)",
            boxShadow: "0 2px 12px rgba(99,82,229,0.06)",
            padding: "32px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "18px",
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <ShieldIcon />
          </div>
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#1a1637",
              margin: "0 0 12px",
            }}
          >
            Security & Privacy
          </h3>
          <p
            style={{
              fontSize: "15px",
              color: "#6b6880",
              lineHeight: "1.7",
              margin: "0 0 20px",
            }}
          >
            Your data is encrypted and never used to train global AI models.
            Learn how we protect your academic integrity.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {[
              "256-bit Encryption",
              "Data Residency",
              "SOC2 Compliance",
              "Private AI Nodes",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "#474554",
                }}
              >
                <span style={{ color: "#5046e5", flexShrink: 0 }}>
                  <CheckIcon />
                </span>
                {item}
              </div>
            ))}
          </div>
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
            Read our Trust Report <ExternalIcon />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── FAQ ──
const faqs = [
  "Does FSTUDY support multiple languages ?",
  "How many documents can I upload on the free plan ?",
  "Can I export my AI conversations ?",
];

function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ padding: "0 48px 80px", margin: "0 auto" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          border: "1px solid rgba(99,82,229,0.1)",
          boxShadow: "0 2px 12px rgba(99,82,229,0.06)",
          padding: "40px 48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#1a1637",
                margin: "0 0 8px",
                letterSpacing: "-0.5px",
              }}
            >
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: "14px", color: "#524f63", margin: 0 }}>
              Quick answers to common questions from the community.
            </p>
          </div>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "99px",
              border: "1.5px solid #e0dbf5",
              background: "#fff",
              color: "#1a1637",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginTop: "4px",
            }}
          >
            View All FAQ
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {faqs.map((q, i) => (
            <div key={i} style={{ borderBottom: "1px solid #ede9f8" }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "24px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1a1637",
                  textAlign: "left",
                }}
              >
                {q}
                <span style={{ color: "#5046e5", flexShrink: 0 }}>
                  <PlusIcon />
                </span>
              </button>
              {open === i && (
                <div
                  style={{
                    padding: "0 0 24px",
                    fontSize: "15px",
                    color: "#6b6880",
                    lineHeight: "1.7",
                  }}
                >
                  {i === 0 &&
                    "Yes! FSTUDY supports over 30 languages for document upload and AI processing, including Vietnamese, English, Japanese, Korean, and more."}
                  {i === 1 &&
                    "On the free plan, you can upload up to 50 documents per month with a maximum file size of 10MB each. Upgrade to Premium for unlimited uploads."}
                  {i === 2 &&
                    "Absolutely. You can export your AI conversations as PDF or Markdown from any chat session. Go to the chat menu and select Export."}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CTA ──
function CTA() {
  return (
    <div style={{ padding: "0 48px 80px" }}>
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
            letterSpacing: "-0.5px",
          }}
        >
          Can't find what you're looking for ?
        </h2>
        <p
          style={{
            fontSize: "15px",
            color: "rgba(255,255,255,0.75)",
            margin: "0 0 40px",
            lineHeight: "1.6",
          }}
        >
          Our support team is available 24/7 to help you with any technical
          issues or feature requests.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              padding: "14px 32px",
              borderRadius: "99px",
              background: "#fff",
              color: "#4338ca",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              border: "none",
            }}
          >
            Contact Support
          </button>
          <button
            style={{
              padding: "14px 32px",
              borderRadius: "99px",
              background: "transparent",
              border: "2px solid rgba(255,255,255,0.4)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Join Discord Community
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Footer ──
export default function GuidePage() {
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
      <GuideCards />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
