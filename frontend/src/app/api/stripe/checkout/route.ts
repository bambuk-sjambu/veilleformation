import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLAN_PRICES, PlanType, BillingPeriod } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, billingPeriod } = body as { plan: PlanType; billingPeriod: BillingPeriod };

    if (!plan || !billingPeriod || plan === "free") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const db = getDb();
    const dbUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(user.userId) as { id: number; email: string; stripe_customer_id: string | null };

    let customerId = dbUser.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: dbUser.email,
        metadata: {
          userId: dbUser.id.toString(),
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, dbUser.id);
    }

    // Get price ID
    const priceId = PLAN_PRICES[plan]?.[billingPeriod];
    if (!priceId) {
      return NextResponse.json({ error: "Prix non trouvé" }, { status: 400 });
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/abonnement?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pricing?canceled=true`,
      metadata: {
        userId: dbUser.id.toString(),
        plan,
      },
      subscription_data: {
        metadata: {
          userId: dbUser.id.toString(),
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session" },
      { status: 500 }
    );
  }
}
