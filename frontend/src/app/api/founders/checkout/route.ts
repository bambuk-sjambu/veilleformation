import { NextRequest, NextResponse } from "next/server";
import { getStripe, FOUNDER_PRICES, FOUNDER_CAPS } from "@/lib/stripe";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/founders/checkout
 *
 * Crée une session Stripe Checkout one-shot (mode=payment, pas subscription)
 * pour l'offre Founder active. La phase est déterminée serveur-side selon
 * l'état de la DB (sold-out phase 1 → bascule phase 2).
 *
 * Pas d'authentification : un visiteur achète sans avoir de compte préalable.
 * Le compte sera créé par le webhook quand le paiement réussit.
 *
 * Body : { email?: string }  (pré-remplit Stripe Checkout si fourni)
 */
export async function POST(request: NextRequest) {
  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body optionnel
  }

  // Détermine la phase active
  const db = getDb();
  let phase1Sold = 0;
  try {
    phase1Sold = (
      db
        .prepare("SELECT COUNT(*) as n FROM users WHERE founder_phase = 1")
        .get() as { n: number }
    ).n;
  } catch {
    // colonne pas encore créée
  }
  const activePhase: 1 | 2 = phase1Sold >= FOUNDER_CAPS.phase1 ? 2 : 1;
  const priceId = activePhase === 1 ? FOUNDER_PRICES.phase1 : FOUNDER_PRICES.phase2;

  if (!priceId || priceId.startsWith("price_founder_phase_")) {
    return NextResponse.json(
      { error: "Stripe price non configuré pour cette phase." },
      { status: 500 }
    );
  }

  // Si la phase 2 est aussi vidée, on refuse
  if (activePhase === 2) {
    let phase2Sold = 0;
    try {
      phase2Sold = (
        db
          .prepare("SELECT COUNT(*) as n FROM users WHERE founder_phase = 2")
          .get() as { n: number }
      ).n;
    } catch {
      // ignore
    }
    if (phase2Sold >= FOUNDER_CAPS.phase2) {
      return NextResponse.json(
        { error: "Toutes les places Founder sont vendues." },
        { status: 410 }
      );
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cipia.fr";
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      ...(body.email ? { customer_email: body.email } : {}),
      success_url: `${baseUrl}/founders/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/founders?canceled=true`,
      metadata: {
        founder_phase: String(activePhase),
        sector_id: "cipia",
      },
      payment_intent_data: {
        metadata: {
          founder_phase: String(activePhase),
          sector_id: "cipia",
        },
      },
      // TVA 20% (Cipia est assujetti)
      automatic_tax: { enabled: false },
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      // Génère facture PDF Stripe
      invoice_creation: { enabled: true },
      locale: "fr",
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      activePhase,
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur Stripe inconnue";
    console.error("Founder checkout error:", e);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session", details: errorMessage },
      { status: 500 }
    );
  }
}
