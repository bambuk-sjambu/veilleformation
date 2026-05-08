import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const db = getDb();
    const dbUser = db
      .prepare("SELECT stripe_customer_id, plan FROM users WHERE id = ?")
      .get(user.userId) as
      | { stripe_customer_id: string | null; plan: string | null }
      | undefined;

    if (!dbUser?.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun client Stripe" }, { status: 400 });
    }

    // Founders sont en mode payment one-shot, pas subscription.
    // Le Customer Portal ne leur sert à rien (rien à annuler).
    if (dbUser.plan === "founder") {
      return NextResponse.json(
        {
          error:
            "Votre place Founder est un paiement unique sans abonnement. Aucun portail à gérer. Pour toute question : contact@cipia.fr",
        },
        { status: 400 }
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/abonnement`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du portail" },
      { status: 500 }
    );
  }
}
