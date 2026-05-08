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

// Price IDs for each plan. Pivot 2026-05 : gamme officielle = solo + cabinet
// (yearly only). Les anciens equipe/agence sont conservés pour rétrocompat
// lecture (zéro abonné actuellement, pas de migration nécessaire).
export const PLAN_PRICES = {
  solo: {
    monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || "price_solo_monthly",
    yearly: process.env.STRIPE_PRICE_SOLO_YEARLY || "price_solo_yearly",
  },
  cabinet: {
    monthly: process.env.STRIPE_PRICE_CABINET_MONTHLY || "price_cabinet_monthly",
    yearly: process.env.STRIPE_PRICE_CABINET_YEARLY || "price_cabinet_yearly",
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

// Founders : prix one-shot par phase (mode payment Stripe, pas subscription)
export const FOUNDER_PRICES = {
  phase1: process.env.STRIPE_PRICE_FOUNDER_PHASE_1 || "price_founder_phase_1",
  phase2: process.env.STRIPE_PRICE_FOUNDER_PHASE_2 || "price_founder_phase_2",
} as const;

export const FOUNDER_CAPS = {
  phase1: 250, // Lifetime, OF Qualiopi uniquement
  phase2: 1000, // 5 ans, multi-secteurs possible
} as const;

export type PlanType = "free" | "solo" | "cabinet" | "equipe" | "agence" | "founder";
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
    cabinet: {
      maxExports: -1,
      hasAlertes: true,
      hasEquipe: true,
      maxUsers: 10,
      hasApi: false,
      hasWhiteLabel: true,
      historyMonths: 24,
    },
    founder: {
      maxExports: -1,
      hasAlertes: true,
      hasEquipe: false,
      maxUsers: 1,
      hasApi: false,
      hasWhiteLabel: false,
      historyMonths: 24,
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
