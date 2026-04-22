import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getPlanFromPriceId, type PlanType } from "@/lib/stripe";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanType;

        if (userId && plan) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          // Get subscription details
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);

          db.prepare(`
            UPDATE users
            SET plan = ?,
                stripe_customer_id = ?,
                stripe_subscription_id = ?,
                subscription_status = 'active',
                subscription_period_end = datetime(?, 'unixepoch')
            WHERE id = ?
          `).run(plan, customerId, subscriptionId, (subscription as any).current_period_end, userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const plan = subscription.metadata?.plan as PlanType;

        if (userId) {
          const status = subscription.status === "active" ? "active" :
                         subscription.status === "past_due" ? "past_due" :
                         subscription.status === "canceled" ? "canceled" : "incomplete";

          db.prepare(`
            UPDATE users
            SET subscription_status = ?,
                subscription_period_end = datetime(?, 'unixepoch')
                ${plan ? ", plan = ?" : ""}
            WHERE id = ?
          `).run(
            status,
            (subscription as any).current_period_end,
            ...(plan ? [plan] : []),
            userId
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          db.prepare(`
            UPDATE users
            SET plan = 'free',
                subscription_status = 'canceled',
                stripe_subscription_id = NULL
            WHERE id = ?
          `).run(userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by customer ID
        const user = db.prepare("SELECT id FROM users WHERE stripe_customer_id = ?").get(customerId) as { id: number } | undefined;

        if (user) {
          db.prepare(`
            UPDATE users
            SET subscription_status = 'past_due'
            WHERE id = ?
          `).run(user.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
