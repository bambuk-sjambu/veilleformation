import Stripe from "stripe";

// Lazy initialization to avoid build errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

// Price IDs for each plan (monthly)
export const PLAN_PRICES = {
  solo: {
    monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || "price_solo_monthly",
    yearly: process.env.STRIPE_PRICE_SOLO_YEARLY || "price_solo_yearly",
  },
  equipe: {
    monthly: process.env.STRIPE_PRICE_EQUIPE_MONTHLY || "price_equipe_monthly",
    yearly: process.env.STRIPE_PRICE_EQUIPE_YEARLY || "price_equipe_yearly",
  },
  agence: {
    monthly: process.env.STRIPE_PRICE_AGENCE_MONTHLY || "price_agence_monthly",
    yearly: process.env.STRIPE_PRICE_AGENCE_YEARLY || "price_agence_yearly",
  },
} as const;

export type PlanType = "free" | "solo" | "equipe" | "agence";
export type BillingPeriod = "monthly" | "yearly";

export function getPlanFromPriceId(priceId: string): PlanType | null {
  for (const [plan, prices] of Object.entries(PLAN_PRICES)) {
    if (Object.values(prices).includes(priceId)) {
      return plan as PlanType;
    }
  }
  return null;
}

export function getPlanFeatures(plan: PlanType) {
  const features = {
    free: {
      maxExports: 1, // per month
      hasAlertes: false,
      hasEquipe: false,
      maxUsers: 1,
      hasApi: false,
      hasWhiteLabel: false,
      historyMonths: 1,
    },
    solo: {
      maxExports: -1, // unlimited
      hasAlertes: true,
      hasEquipe: false,
      maxUsers: 1,
      hasApi: false,
      hasWhiteLabel: false,
      historyMonths: 6,
    },
    equipe: {
      maxExports: -1,
      hasAlertes: true,
      hasEquipe: true,
      maxUsers: 5,
      hasApi: false,
      hasWhiteLabel: false,
      historyMonths: 12,
    },
    agence: {
      maxExports: -1,
      hasAlertes: true,
      hasEquipe: true,
      maxUsers: 20,
      hasApi: true,
      hasWhiteLabel: true,
      historyMonths: 24,
    },
  };
  return features[plan];
}
