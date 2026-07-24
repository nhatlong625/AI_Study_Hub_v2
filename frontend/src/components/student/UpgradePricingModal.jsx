import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { payosService } from "../../services/payosService";
import {
  formatVnd,
  getPlanDiscount,
  getPlanOriginalPrice,
  getPlanPrice,
  pricingService,
} from "../../services/pricingService";
import { userService } from "../../services/userService";
import { formatStorageMb } from "../../utils/formatStorage";

const MODAL_Z_INDEX = 2147483647;

const PLANS = [
  {
    key: "basic",
    planCode: "BASIC",
    name: "Basic",
    monthlyAmount: 0,
    features: [
      { label: "10 quiz generations/month", included: true },
      { label: "1GB cloud storage", included: true },
      { label: "Priority support", included: false },
      { label: "Advanced AI models", included: false },
    ],
    cta: "Current Plan",
    variant: "outline",
  },
  {
    key: "plus",
    planCode: "PLUS",
    name: "Plus",
    features: [
      { label: "30 quiz generations/month", included: true },
      { label: "10GB cloud storage", included: true },
      { label: "Priority email support", included: true },
      { label: "Smart citation generator", included: true },
    ],
    cta: "Upgrade to Plus",
    variant: "outline",
  },
  {
    key: "pro",
    planCode: "PRO",
    name: "Pro",
    features: [
      { label: "Unlimited quiz generations", included: true },
      { label: "50GB cloud storage", included: true },
      { label: "Offline mode & sync", included: true },
      { label: "24/7 Dedicated support", included: true },
    ],
    cta: "Get Pro Now",
    variant: "dark",
  },
];

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const value =
      user.userId ?? user.id ?? localStorage.getItem("aiStudyUserId");
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 1;
  } catch {
    return 1;
  }
}

function normalizePlanCode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || "BASIC";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function cleanModalError(message) {
  const text = String(message || "").trim();
  if (!text) return "Could not complete this action. Please try again.";
  return text
    .replace(/^Internal server error:\s*/i, "")
    .replace(/^Failed to create payment link:\s*/i, "")
    .replace(/PreparedStatementCallback; uncategorized SQLException for SQL \[[\s\S]*?\];\s*/i, "")
    .replace(/SQL state \[[^\]]+\];\s*/i, "")
    .replace(/error code \[[^\]]+\];\s*/i, "")
    .trim() || "Could not complete this action. Please try again.";
}

function parsePlanFeatures(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return String(value)
      .split("\n")
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({ label, included: true }));
  }
  return [];
}

function buildFeatureList(source, fallbackFeatures) {
  const maxStorageMb = Number(source?.maxStorage);
  const maxQuizValue = Number(source?.maxQuiz);
  const maxStorage = Number.isFinite(maxStorageMb) && maxStorageMb > 0
    ? formatStorageMb(maxStorageMb)
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
    ...(maxStorage !== null ? [{ label: `${maxStorage} cloud storage`, included: true }] : []),
    ...filteredFeatures,
  ];
}

function CheckIcon({ light = false }) {
  const color = light ? "#ffffff" : "#5046e5";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="12" fill={color} opacity="0.16" />
      <polyline
        points="7 12 10.5 15.5 17 9"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#d1d5db" opacity="0.3" />
      <line
        x1="8"
        y1="8"
        x2="16"
        y2="16"
        stroke="#9ca3af"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="8"
        x2="8"
        y2="16"
        stroke="#9ca3af"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PricingCard({
  plan,
  amount,
  billingCycle,
  disabled,
  currentPlanCode,
  currentEndDate,
  onUpgrade,
}) {
  const isCurrent = normalizePlanCode(plan.planCode) === currentPlanCode;
  const expiryText =
    isCurrent && currentEndDate ? `Expires ${formatDate(currentEndDate)}` : "";
  const buttonStyle = {
    background: "transparent",
    color: "#1a1637",
    border: "1px solid #d8d3eb",
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flex: "0 0 clamp(230px, 17vw, 260px)",
        minHeight: "360px",
        flexDirection: "column",
        borderRadius: "16px",
        padding: "28px 22px",
        background: "#ffffff",
        color: "#1a1637",
        border: "1px solid #ece8f5",
        boxShadow: "0 2px 10px rgba(26, 22, 55, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          margin: "0 0 12px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 800,
          }}
        >
          {plan.name}
        </h3>
        {expiryText && (
          <span
            style={{
              borderRadius: "999px",
              background: "#eef2ff",
              color: "#5046e5",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {expiryText}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "6px",
          marginBottom: plan.discountPercent > 0 ? "6px" : "22px",
        }}
      >
        <span style={{ fontSize: "32px", fontWeight: 900, lineHeight: 1 }}>
          {formatVnd(amount)}
        </span>
        <span style={{ fontSize: "13px", opacity: 0.72 }}>
          {billingCycle === "Yearly" ? "/year" : "/month"}
        </span>
      </div>
      {plan.discountPercent > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <span style={{ textDecoration: "line-through", opacity: 0.7, fontSize: 14 }}>
            {formatVnd(plan.originalAmount)}
          </span>
          <strong style={{ background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "4px 9px", fontSize: 11 }}>
            SAVE {plan.discountPercent}%
          </strong>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: "12px",
          marginBottom: "22px",
        }}
      >
        {plan.features.map((feature) => (
          <div
            key={feature.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              lineHeight: 1.35,
            }}
          >
            {feature.included ? (
              <CheckIcon />
            ) : (
              <CrossIcon />
            )}
            <span style={{ opacity: feature.included ? 1 : 0.54 }}>
              {feature.label}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={isCurrent || disabled}
        onClick={() => onUpgrade(plan, amount)}
        style={{
          width: "100%",
          borderRadius: "999px",
          padding: "11px 12px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: isCurrent || disabled ? "default" : "pointer",
          opacity: disabled && !isCurrent ? 0.68 : 1,
          ...buttonStyle,
        }}
      >
        {isCurrent ? "Current Plan" : disabled ? "Creating link..." : plan.cta}
      </button>
    </div>
  );
}

export default function UpgradePricingModal({ isOpen, onClose }) {
  const [billingCycle, setBillingCycle] = useState("Monthly");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [pricing, setPricing] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.classList.add("upgrade-modal-open");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("upgrade-modal-open");
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const userId = getCurrentUserId();

    Promise.all([
      pricingService.getPlans().catch(() => null),
      userService.getSubscription(userId).catch(() => null),
    ]).then(([plans, currentSubscription]) => {
      if (cancelled) return;
      setPricing(plans);
      setSubscription(currentSubscription);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const plans = useMemo(() => {
    const sourcePlans = pricing?.__plans?.length
      ? pricing.__plans.map((plan) => ({
          key: String(plan.planCode || plan.code).toLowerCase(),
          planCode: plan.planCode || plan.code,
          name: plan.name || plan.planCode || plan.code,
          features: plan.features || [],
          cta: (plan.planCode || plan.code) === "BASIC"
            ? "Current Plan"
            : `Upgrade to ${plan.name || plan.planCode || plan.code}`,
          variant: "outline",
        }))
      : PLANS;

    return sourcePlans.map((plan) => {
      const code = String(plan.planCode || "").toUpperCase();
      const dynamicPlan = code && pricing ? pricing[code] : null;
      const isCurrent = code === normalizePlanCode(subscription?.planName);
      const subscriptionSnapshot = isCurrent
        ? {
            maxStorage: subscription?.maxStorage,
            maxQuiz: subscription?.maxQuiz,
            features: parsePlanFeatures(subscription?.description),
          }
        : null;
      const featureSource = subscriptionSnapshot || dynamicPlan || {
        maxStorage: plan.planCode === "BASIC" ? 1024 : plan.planCode === "PLUS" ? 10240 : 51200,
        maxQuiz: plan.planCode === "BASIC" ? 10 : plan.planCode === "PLUS" ? 30 : -1,
        features: plan.features,
      };
      const features = buildFeatureList(featureSource, plan.features);
      const lockedMonthlyAmount = isCurrent
        ? Number(subscription?.price || 0)
        : 0;
      const displayedAmount = isCurrent
        ? billingCycle === "Yearly" ? lockedMonthlyAmount * 12 : lockedMonthlyAmount
        : plan.planCode === "BASIC"
          ? 0
          : getPlanPrice(pricing || {}, plan.planCode, billingCycle);
      const displayedOriginalAmount = isCurrent
        ? displayedAmount
        : plan.planCode === "BASIC"
          ? 0
          : getPlanOriginalPrice(pricing || {}, plan.planCode, billingCycle);

      return {
        ...plan,
        amount: displayedAmount,
        originalAmount: displayedOriginalAmount,
        discountPercent:
          isCurrent || plan.planCode === "BASIC"
            ? 0
            : getPlanDiscount(pricing || {}, plan.planCode, billingCycle),
        features,
      };
    });
  }, [billingCycle, pricing, subscription]);

  const currentPlanCode = normalizePlanCode(subscription?.planName);
  const currentEndDate = subscription?.endDate || "";

  const handleUpgrade = async (plan, amount) => {
    if (normalizePlanCode(plan.planCode) === currentPlanCode) return;
    if (plan.key === "basic") return;
    setError("");
    setLoadingPlan(plan.key);

    try {
      const orderCode = payosService.generateOrderCode();
      const returnUrl = `${window.location.origin}/payment/result?status=success&order=${orderCode}`;
      const cancelUrl = `${window.location.origin}/payment/result?status=cancelled`;
      const paymentData = await payosService.createPaymentLink({
        userId: getCurrentUserId(),
        orderCode,
        amount,
        planCode: plan.planCode,
        billingCycle,
        description: `${plan.name || plan.planCode} PLAN`,
        returnUrl,
        cancelUrl,
      });

      if (paymentData.checkoutUrl) {
        payosService.openPaymentWindow(paymentData.checkoutUrl);
        onClose?.();
      } else {
        throw new Error("Backend did not return a checkout URL.");
      }
    } catch (err) {
      setError(cleanModalError(err?.message));
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade plan"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: MODAL_Z_INDEX,
        isolation: "isolate",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        pointerEvents: "auto",
        transform: "translateZ(0)",
      }}
    >
      <style>{`
        body.upgrade-modal-open .ai-tutor-shell .ai-tutor-main,
        body.upgrade-modal-open .ai-tutor-shell .chat-sidebar {
          z-index: 0 !important;
        }
      `}</style>
      <button
        type="button"
        aria-label="Close upgrade modal backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          border: "none",
          background: "rgba(17, 16, 28, 0.72)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          cursor: "default",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: MODAL_Z_INDEX,
          width: "min(1480px, calc(100vw - 40px))",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "24px",
          background: "#f4f0fe",
          padding: "40px 36px 34px",
          boxShadow: "0 34px 90px rgba(17, 16, 28, 0.42)",
          transform: "translateZ(0)",
          opacity: 1,
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: "34px",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade modal"
            style={{
              position: "absolute",
              top: "-10px",
              right: "-10px",
              width: "36px",
              height: "36px",
              border: "none",
              borderRadius: "50%",
              background: "transparent",
              color: "#6b6880",
              cursor: "pointer",
              fontSize: "24px",
              lineHeight: 1,
            }}
          >
            x
          </button>

          <h2
            style={{
              margin: "0 0 8px",
              color: "#1a1637",
              fontSize: "32px",
              fontWeight: 900,
            }}
          >
            Elevate Your Learning
          </h2>
          <p style={{ margin: "0 0 24px", color: "#5f5b73", fontSize: "15px" }}>
            Choose the plan that fits your academic journey.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle("Monthly")}
              style={{
                border: "none",
                background: "transparent",
                color: billingCycle === "Monthly" ? "#1a1637" : "#6b6880",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: billingCycle === "Monthly" ? 800 : 600,
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() =>
                setBillingCycle((value) =>
                  value === "Yearly" ? "Monthly" : "Yearly",
                )
              }
              aria-label="Toggle billing cycle"
              style={{
                position: "relative",
                width: "44px",
                height: "24px",
                border: "none",
                borderRadius: "999px",
                background: billingCycle === "Yearly" ? "#5046e5" : "#d1cce8",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: billingCycle === "Yearly" ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
                  transition: "left 0.18s ease",
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("Yearly")}
              style={{
                border: "none",
                background: "transparent",
                color: billingCycle === "Yearly" ? "#1a1637" : "#6b6880",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: billingCycle === "Yearly" ? 800 : 600,
              }}
            >
              Yearly
            </button>
            {billingCycle === "Yearly" && (
              <span
                style={{
                  borderRadius: "999px",
                  background: "#fef3c7",
                  color: "#b45309",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                SAVE 20%
              </span>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              position: "relative",
              zIndex: 2,
              margin: "0 auto 24px",
              maxWidth: "720px",
              width: "100%",
              borderRadius: "12px",
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.45,
              overflowWrap: "anywhere",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "16px",
            overflowX: "auto",
            padding: "4px 4px 14px",
            scrollSnapType: "x proximity",
            alignItems: "stretch",
          }}
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              amount={plan.amount}
              billingCycle={billingCycle}
              disabled={loadingPlan !== null}
              currentPlanCode={currentPlanCode}
              currentEndDate={currentEndDate}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>

        <p
          style={{
            position: "relative",
            zIndex: 2,
            margin: "24px 0 0",
            textAlign: "center",
            color: "#8f8aa3",
            fontSize: "12px",
          }}
        >
          Prices are synced with the current plan settings in VND. You can
          cancel your subscription at any time.
        </p>
      </div>
    </div>,
    document.body,
  );
}
