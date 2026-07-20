import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import socialProofImg from "../../assets/images/social-proof.png";
import {
  formatVnd,
  getPlanDiscount,
  getPlanOriginalPrice,
  getPlanPrice,
  pricingService,
} from "../../services/pricingService";

// ── Icons ──
const CheckIcon = ({ color = "#5046e5" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="12" fill={color} opacity="0.15" />
    <polyline
      points="7 12 10.5 15.5 17 9"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="12" fill="#ccc" opacity="0.25" />
    <line
      x1="8"
      y1="8"
      x2="16"
      y2="16"
      stroke="#aaa"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <line
      x1="16"
      y1="8"
      x2="8"
      y2="16"
      stroke="#aaa"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Helper to format plan features dynamically (matching Upgrade modal logic)
function buildFeatureList(source, fallbackFeatures = []) {
  const maxStorageMb = Number(source?.maxStorage);
  const maxQuizValue = Number(source?.maxQuiz);
  const maxStorage = Number.isFinite(maxStorageMb) && maxStorageMb > 0
    ? maxStorageMb / 1024
    : null;
  const maxQuiz = maxQuizValue === -1
    ? "Unlimited"
    : Number.isFinite(maxQuizValue) && maxQuizValue > 0
      ? maxQuizValue
      : null;
  const baseFeatures = source?.features?.length ? source.features : fallbackFeatures;
  const filteredFeatures = (baseFeatures || []).filter((feature) => {
    const label = String(feature?.label || "").toLowerCase();
    return !label.includes("cloud storage") && !label.includes("quiz generation");
  });

  return [
    ...(maxQuiz !== null ? [{ label: `${maxQuiz} quiz generations/month`, included: true }] : []),
    ...(maxStorage !== null ? [{ label: `${maxStorage}GB cloud storage`, included: true }] : []),
    ...filteredFeatures,
  ];
}

// Default Fallback Plans Data
const PLANS = {
  monthly: [
    {
      key: "basic",
      planCode: "BASIC",
      name: "Basic",
      tagline: "For casual learners",
      price: 0,
      features: [
        { label: "10 quiz generations/month", included: true },
        { label: "1GB cloud storage", included: true },
        { label: "Priority support", included: false },
        { label: "Advanced AI models", included: false },
      ],
      cta: "Current Plan",
      ctaStyle: "outline",
      highlight: false,
    },
    {
      key: "plus",
      planCode: "PLUS",
      name: "Plus",
      tagline: "Most popular for university",
      price: 20000,
      features: [
        { label: "30 quiz generations/month", included: true },
        { label: "10GB cloud storage", included: true },
        { label: "Priority email support", included: true },
        { label: "Smart citation generator", included: true },
      ],
      cta: "Upgrade to Plus",
      ctaStyle: "outline",
      highlight: false,
    },
    {
      key: "pro",
      planCode: "PRO",
      name: "Pro",
      tagline: "Advanced AI tools for power users",
      price: 100000,
      features: [
        { label: "Unlimited quiz generations", included: true },
        { label: "50GB cloud storage", included: true },
        { label: "Offline mode & sync", included: true },
        { label: "24/7 Dedicated support", included: true },
      ],
      cta: "Upgrade to Pro",
      ctaStyle: "dark",
      highlight: false,
    },
    {
      key: "super",
      planCode: "SUPER",
      name: "Super",
      tagline: "For high-volume academic study",
      price: 500000,
      features: [
        { label: "Unlimited quiz generations", included: true },
        { label: "100GB cloud storage", included: true },
        { label: "Super AI model access", included: true },
        { label: "Priority 24/7 support", included: true },
      ],
      cta: "Upgrade to Super",
      ctaStyle: "outline",
      highlight: false,
    },
    {
      key: "premium",
      planCode: "PREMIUM",
      name: "Premium",
      tagline: "Ultimate features & unlimited power",
      price: 1000000,
      features: [
        { label: "Unlimited quiz generations", included: true },
        { label: "500GB cloud storage", included: true },
        { label: "Custom AI model tuning", included: true },
        { label: "VIP support & team features", included: true },
      ],
      cta: "Upgrade to Premium",
      ctaStyle: "outline",
      highlight: false,
    },
  ],
  yearly: [
    {
      key: "basic",
      planCode: "BASIC",
      name: "Basic",
      tagline: "For casual learners",
      price: 0,
      features: [
        { label: "10 quiz generations/month", included: true },
        { label: "1GB cloud storage", included: true },
        { label: "Priority support", included: false },
        { label: "Advanced AI models", included: false },
      ],
      cta: "Current Plan",
      ctaStyle: "outline",
      highlight: false,
    },
    {
      key: "plus",
      planCode: "PLUS",
      name: "Plus",
      tagline: "Most popular for university",
      price: 240000,
      features: [
        { label: "30 quiz generations/month", included: true },
        { label: "10GB cloud storage", included: true },
        { label: "Priority email support", included: true },
        { label: "Smart citation generator", included: true },
      ],
      cta: "Upgrade to Plus",
      ctaStyle: "outline",
      highlight: false,
    },
    {
      key: "pro",
      planCode: "PRO",
      name: "Pro",
      tagline: "Advanced AI tools for power users",
      price: 1200000,
      features: [
        { label: "Unlimited quiz generations", included: true },
        { label: "50GB cloud storage", included: true },
        { label: "Offline mode & sync", included: true },
        { label: "24/7 Dedicated support", included: true },
      ],
      cta: "Upgrade to Pro",
      ctaStyle: "dark",
      highlight: false,
    },
    {
      key: "super",
      planCode: "SUPER",
      name: "Super",
      tagline: "For high-volume academic study",
      price: 6000000,
      features: [
        { label: "Unlimited quiz generations", included: true },
        { label: "100GB cloud storage", included: true },
        { label: "Super AI model access", included: true },
        { label: "Priority 24/7 support", included: true },
      ],
      cta: "Upgrade to Super",
      ctaStyle: "outline",
      highlight: false,
    },
    {
      key: "premium",
      planCode: "PREMIUM",
      name: "Premium",
      tagline: "Ultimate features & unlimited power",
      price: 12000000,
      features: [
        { label: "Unlimited quiz generations", included: true },
        { label: "500GB cloud storage", included: true },
        { label: "Custom AI model tuning", included: true },
        { label: "VIP support & team features", included: true },
      ],
      cta: "Upgrade to Premium",
      ctaStyle: "outline",
      highlight: false,
    },
  ],
};

// ── Toggle ──
function BillingToggle({ yearly, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: "15px",
          fontWeight: yearly ? "500" : "700",
          color: yearly ? "#6b6880" : "#1a1637",
        }}
      >
        Monthly
      </span>
      <div
        onClick={onChange}
        style={{
          width: "48px",
          height: "26px",
          borderRadius: "99px",
          background: yearly ? "#5046e5" : "#d1cce8",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: yearly ? "25px" : "3px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "15px",
          fontWeight: yearly ? "700" : "500",
          color: yearly ? "#1a1637" : "#6b6880",
        }}
      >
        Yearly
      </span>
      <span
        style={{
          background: "#fef3c7",
          color: "#d97706",
          fontSize: "12px",
          fontWeight: "700",
          padding: "3px 8px",
          borderRadius: "99px",
        }}
      >
        Save 20%
      </span>
    </div>
  );
}

// ── Pricing Cards ──
function PricingCards({ plans }) {
  return (
    <div
      className="pricing-cards-scroll-container"
      style={{
        width: "100%",
        overflowX: "auto",
        paddingBottom: "16px",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        className="pricing-cards-scroll-track"
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "stretch",
          justifyContent: "center",
          minWidth: "max-content",
          margin: "0 auto",
          padding: "12px 24px 24px 24px",
          scrollSnapType: "x mandatory",
        }}
      >
        {plans.map((plan) => (
          <PricingCard key={plan.key || plan.name} plan={plan} />
        ))}
      </div>

      <style>{`
        .pricing-cards-scroll-container::-webkit-scrollbar {
          height: 10px;
        }
        .pricing-cards-scroll-container::-webkit-scrollbar-track {
          background: #e9e4f5;
          border-radius: 99px;
          margin: 0 clamp(16px, 10vw, 220px);
        }
        .pricing-cards-scroll-container::-webkit-scrollbar-thumb {
          background: #a594f9;
          border-radius: 99px;
          transition: background 0.2s;
        }
        .pricing-cards-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #7c3aed;
        }
      `}</style>
    </div>
  );
}

function PricingCard({ plan }) {
  const [hovered, setHovered] = useState(false);

  // Determine if user is already logged in
  const isLoggedIn = (() => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return !!(token && user);
    } catch {
      return false;
    }
  })();

  // Build the correct CTA link:
  // - Basic plan → login or student home (no upgrade)
  // - Paid plans → login with redirect=upgrade, or student home with upgrade=1
  const ctaLink = (() => {
    const isBasic = plan.planCode === "BASIC";
    if (isBasic) {
      return isLoggedIn ? "/student/home" : "/login";
    }
    if (isLoggedIn) {
      return "/student/home?upgrade=1";
    }
    return `/login?redirect=upgrade`;
  })();

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "36px 30px",
    color: "#1a1637",
    border: "1.5px solid #ece8f5",
    position: "relative",
    zIndex: 1,
    flex: "0 0 330px",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "490px",
    scrollSnapAlign: "center",
    boxShadow: "0 4px 20px rgba(26, 22, 55, 0.05)",
    transition: "all 0.22s ease-in-out",
  };

  const ctaStyle = (() => {
    if (plan.ctaStyle === "dark" || plan.planCode === "PRO")
      return {
        background: "#1a1637",
        color: "#ffffff",
        fontWeight: "700",
        border: "1.5px solid #1a1637",
        boxShadow: "0 4px 12px rgba(26, 22, 55, 0.15)",
      };
    return {
      background: "transparent",
      color: "#1a1637",
      fontWeight: "700",
      border: "1.5px solid #d1cce8",
    };
  })();

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(80, 70, 229, 0.12)";
        e.currentTarget.style.borderColor = "#c4b5fd";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(26, 22, 55, 0.04)";
        e.currentTarget.style.borderColor = "#ece8f5";
      }}
    >
      {/* Top Section (Header + Price + Features) */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{ fontSize: "22px", fontWeight: "800", marginBottom: "4px", color: "#1a1637" }}
          >
            {plan.name}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#6b6880",
              lineHeight: "1.35",
            }}
          >
            {plan.tagline}
          </div>
        </div>

        {/* Price */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "4px",
            marginBottom: plan.discountPercent > 0 ? "6px" : "22px",
          }}
        >
          <span style={{ fontSize: "38px", fontWeight: "900", lineHeight: 1, letterSpacing: "-0.5px" }}>
            {formatVnd(plan.price)}
          </span>
          <span style={{ fontSize: "14px", opacity: 0.65, marginBottom: "4px", fontWeight: "600" }}>
            {plan.billingSuffix}
          </span>
        </div>

        {plan.discountPercent > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ textDecoration: "line-through", opacity: 0.65, fontSize: 13 }}>
              {formatVnd(plan.originalPrice)}
            </span>
            <strong style={{ background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "3px 8px", fontSize: 11 }}>
              SAVE {plan.discountPercent}%
            </strong>
          </div>
        )}

        {/* Features list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {plan.features.map((f, idx) => (
            <div
              key={f.label || idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13.5px",
                lineHeight: "1.35",
              }}
            >
              {f.included !== false ? (
                <CheckIcon color="#5046e5" />
              ) : (
                <CrossIcon />
              )}
              <span style={{ opacity: f.included !== false ? 1 : 0.5, fontWeight: f.included !== false ? 500 : 400 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button pinned to bottom */}
      <div style={{ marginTop: "auto", paddingTop: "16px" }}>
        <Link to={ctaLink} style={{ textDecoration: "none" }}>
          <button
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "99px",
              fontSize: "14.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              opacity: hovered ? 0.9 : 1,
              transform: hovered ? "translateY(-1px)" : "none",
              ...ctaStyle,
            }}
          >
            {plan.cta}
          </button>
        </Link>
      </div>
    </div>
  );
}

// ── Social Proof ──
function SocialProof() {
  return (
    <section style={{ padding: "80px 48px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: "64px",
          alignItems: "stretch",
        }}
      >
        {/* Left */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <h2
            style={{
              fontSize: "36px",
              fontWeight: "900",
              color: "#1a1637",
              margin: "0 0 16px",
              lineHeight: 1.2,
            }}
          >
            Everything you need to excel
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#524f63",
              lineHeight: 1.7,
              margin: "0 0 40px",
            }}
          >
            We've designed our pricing to be fair and transparent. No hidden
            fees, no complicated contracts. Just the tools you need to succeed.
          </p>
          <div style={{ display: "flex", gap: "40px" }}>
            {[
              { number: "50k+", label: "STUDENTS" },
              { number: "200+", label: "CAMPUSES" },
            ].map(({ number, label }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: "900",
                    color: "#5046e5",
                  }}
                >
                  {number}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#6b6880",
                    letterSpacing: "1px",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div
          style={{
            borderRadius: "20px",
            border: "1px solid rgba(99,82,229,0.1)",
            boxShadow: "0 8px 32px rgba(80,70,229,0.10)",
            background: "#fff",
            overflow: "hidden",
          }}
        >
          {/* Image top */}
          <div style={{ padding: "12px 12px 0 12px" }}>
            <img
              src={socialProofImg}
              alt="Students"
              style={{
                width: "100%",
                height: "260px",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
                borderRadius: "12px",
              }}
            />
          </div>
          {/* Quote bottom */}
          <div style={{ padding: "24px 28px" }}>
            <p
              style={{
                fontSize: "14px",
                color: "#474554",
                lineHeight: 1.7,
                fontStyle: "italic",
                margin: "0 0 12px",
              }}
            >
              "F STUDY transformed how I manage my research papers. The AI
              analysis is a game-changer for final exams."
            </p>
            <div
              style={{ fontSize: "13px", fontWeight: "700", color: "#1a1637" }}
            >
              — Sarah J., Medical Student
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Hero ──
function Hero({ yearly, onToggle }) {
  return (
    <section style={{ textAlign: "center", padding: "72px 48px 48px" }}>
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
        Simple pricing for smart students
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#524f63",
          margin: "0 0 36px",
          lineHeight: 1.7,
          maxWidth: "480px",
          display: "inline-block",
        }}
      >
        Choose the perfect plan to supercharge your learning with <br />
        AI-driven insights and effortless organization.
      </p>
      <div style={{ marginBottom: "48px" }}>
        <BillingToggle yearly={yearly} onChange={onToggle} />
      </div>
    </section>
  );
}

// ── Page ──
export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    pricingService
      .getPlans()
      .then((plans) => {
        if (!cancelled) setPricing(plans);
      })
      .catch(() => {
        if (!cancelled) setPricing(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = useMemo(() => {
    const billingCycle = yearly ? "Yearly" : "Monthly";
    const basePlans = pricing?.__plans?.length
      ? pricing.__plans.map((plan) => {
          const code = String(plan.code || plan.planCode || "").toUpperCase();
          return {
            key: code.toLowerCase(),
            planCode: code,
            name: plan.name || code.charAt(0) + code.slice(1).toLowerCase(),
            tagline: code === "BASIC" 
              ? "For casual learners" 
              : code === "PLUS" 
                ? "Most popular for university"
                : code === "PRO"
                  ? "Advanced AI tools for power users"
                  : "For growing study needs",
            cta: code === "BASIC" ? "Current Plan" : `Upgrade to ${plan.name || code}`,
            ctaStyle: code === "PRO" ? "dark" : "outline",
            highlight: false,
          };
        })
      : (yearly ? PLANS.yearly : PLANS.monthly);

    return basePlans.map((plan) => {
      const code = String(plan.planCode || "").toUpperCase();
      const dynamicPlan = code && pricing ? pricing[code] : null;
      const price = plan.planCode
        ? getPlanPrice(pricing || {}, plan.planCode, billingCycle)
        : plan.price;
      const originalPrice = plan.planCode
        ? getPlanOriginalPrice(pricing || {}, plan.planCode, billingCycle)
        : plan.price;
      const discountPercent = plan.planCode
        ? getPlanDiscount(pricing || {}, plan.planCode, billingCycle)
        : 0;

      const featureSource = dynamicPlan || {
        maxStorage: code === "BASIC" ? 1024 : code === "PLUS" ? 10240 : code === "PRO" ? 51200 : code === "SUPER" ? 102400 : 512000,
        maxQuiz: code === "BASIC" ? 10 : code === "PLUS" ? 30 : -1,
        features: plan.features,
      };

      const features = buildFeatureList(featureSource, plan.features);

      return {
        ...plan,
        price,
        originalPrice,
        discountPercent,
        billingSuffix: yearly ? "/year" : "/month",
        features,
      };
    });
  }, [pricing, yearly]);

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "#f4f0fe",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,154,58,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(224,154,58,0); }
        }
        .pricing-badge {
          animation: badgePulse 2.2s ease-out infinite;
        }
      `}</style>
      <Navbar />
      <Hero yearly={yearly} onToggle={() => setYearly((v) => !v)} />

      {/* Cards */}
      <div style={{ padding: "0 48px 80px" }}>
        <PricingCards plans={plans} />
      </div>

      <SocialProof />

      <Footer />
    </div>
  );
}
