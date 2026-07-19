const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api"
).replace(/\/$/, "");

const DEFAULT_PRICING = {
  BASIC: { price: 0, priceYearly: 0, originalPrice: 0, originalPriceYearly: 0, monthlyDiscount: 0, yearlyDiscount: 0 },
  PLUS: { price: 999, priceYearly: 11988, originalPrice: 999, originalPriceYearly: 11988, monthlyDiscount: 0, yearlyDiscount: 0 },
  PRO:  { price: 9999, priceYearly: 119988, originalPrice: 9999, originalPriceYearly: 119988, monthlyDiscount: 0, yearlyDiscount: 0 },
};

function normalizePricing(plans = []) {
  return plans.reduce((acc, plan) => {
    const code = String(plan.plan || plan.planCode || "").toUpperCase();
    if (!code) return acc;
    const monthly = Number(plan.priceMonthly ?? plan.price ?? DEFAULT_PRICING[code]?.price ?? 0);
    const monthlyDiscount = Number(plan.monthlyDiscount ?? 0);
    const yearlyDiscount = Number(plan.yearlyDiscount ?? 0);
    const originalYearly = monthly * 12;
    acc[code] = {
      code,
      name: plan.name || plan.planName || code.charAt(0) + code.slice(1).toLowerCase(),
      originalPrice: monthly,
      originalPriceYearly: originalYearly,
      monthlyDiscount,
      yearlyDiscount,
      price: Math.round(monthly * (1 - monthlyDiscount / 100)),
      priceYearly: Math.round(originalYearly * (1 - yearlyDiscount / 100)),
    };
    return acc;
  }, { ...DEFAULT_PRICING });
}

export function getPlanOriginalPrice(pricing, planCode, billingCycle) {
  const plan = pricing[String(planCode || "").toUpperCase()] || {};
  return String(billingCycle).toLowerCase() === "yearly"
    ? Number(plan.originalPriceYearly || 0)
    : Number(plan.originalPrice || 0);
}

export function getPlanDiscount(pricing, planCode, billingCycle) {
  const plan = pricing[String(planCode || "").toUpperCase()] || {};
  return String(billingCycle).toLowerCase() === "yearly"
    ? Number(plan.yearlyDiscount || 0)
    : Number(plan.monthlyDiscount || 0);
}

export function getPlanPrice(pricing, planCode, billingCycle) {
  const plan = pricing[String(planCode || "").toUpperCase()] || DEFAULT_PRICING[planCode] || { price: 0, priceYearly: 0 };
  if (String(billingCycle).toLowerCase() === "yearly") return Number(plan.priceYearly || 0);
  return Number(plan.price || 0);
}

export function formatVnd(value) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))}đ`;
}

export const pricingService = {
  async getPlans() {
    const response = await fetch(`${API_BASE_URL}/payments/plans`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      return {
        ...DEFAULT_PRICING,
        __plans: Object.keys(DEFAULT_PRICING).map((code) => ({ code, name: code.charAt(0) + code.slice(1).toLowerCase() })),
      };
    }
    const data = await response.json().catch(() => ({}));
    
    // Parse features from description if possible
    const rawPlans = (data.plans || []).map(plan => {
      let parsedFeatures = [];
      try {
        if (plan.description) parsedFeatures = JSON.parse(plan.description);
      } catch (e) {
        parsedFeatures = plan.description.split('\n').filter(Boolean).map(label => ({ label, included: true }));
      }
      return { ...plan, features: parsedFeatures };
    });
    
    const normalized = normalizePricing(rawPlans);
    
    // Attach additional details to normalized plans
    rawPlans.forEach(plan => {
      const code = String(plan.plan || plan.planCode || "").toUpperCase();
      if (normalized[code]) {
        normalized[code].code = code;
        normalized[code].name = plan.name || plan.planName || code.charAt(0) + code.slice(1).toLowerCase();
        normalized[code].features = plan.features;
        normalized[code].maxStorage = plan.maxStorage;
        normalized[code].maxQuiz = plan.maxQuiz;
        normalized[code].versionId = plan.versionId;
      }
    });
    normalized.__plans = rawPlans
      .map((plan) => String(plan.plan || plan.planCode || "").toUpperCase())
      .filter(Boolean)
      .map((code) => normalized[code])
      .filter(Boolean);
    
    return normalized;
  },
};
