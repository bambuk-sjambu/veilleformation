import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getPlanFromPriceId, type PlanType } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { releaseFounderReservation, markEventProcessed } from "@/lib/founder-reservations";
import { createMagicLink } from "@/lib/founder-tokens";
import { sendFounderActivationEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  // Idempotence sur event.id : Stripe garantit la stabilité de l'ID même sur retry.
  // On ne le marque comme traité qu'à la fin du switch (commit-after-work) pour
  // permettre un retry après échec partiel (ex: payment_status pending → paid).
  // En revanche on lit dès maintenant pour court-circuiter les doublons exacts.
  const db = getDb();
  const alreadyProcessed = db
    .prepare("SELECT 1 FROM processed_events WHERE event_id = ?")
    .get(event.id);
  if (alreadyProcessed) {
    console.log(`Webhook event ${event.id} (${event.type}) déjà traité — skip`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Cas A : checkout subscription classique (Solo, Cabinet…)
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanType;
        if (userId && plan && session.mode === "subscription") {
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
          break;
        }

        // Cas B : checkout Founder one-shot (mode=payment, sans user authentifié)
        // Pivot Founders 2026-05-08 : on crée le user automatiquement à partir
        // de l'email Stripe, on tag founder_phase + plan='founder', on inscrit
        // au secteur cipia (Phase 1 OF Qualiopi).
        const founderPhase = session.metadata?.founder_phase;
        if (session.mode === "payment" && founderPhase) {
          const phase = parseInt(founderPhase, 10);
          if (phase !== 1 && phase !== 2) break;

          // Vérification que le paiement est effectivement capté (pas SEPA pending)
          if (session.payment_status !== "paid") {
            console.log(
              `Founder webhook: session ${session.id} payment_status=${session.payment_status}, skip (waiting for async_payment_succeeded)`
            );
            break;
          }

          const sessionId = session.id;
          const email = (
            session.customer_details?.email ||
            session.customer_email ||
            ""
          ).toLowerCase().trim();

          // Si pas d'email : retourner 500 pour que Stripe retente (jusqu'à 3 jours)
          // → on a une fenêtre pour fix manuellement avant que le retry n'expire
          if (!email) {
            console.error(`Founder webhook: pas d'email pour session ${sessionId}`);
            return NextResponse.json(
              { error: "Email manquant côté Stripe" },
              { status: 500 }
            );
          }

          const fullName = session.customer_details?.name || "";
          const [firstName, ...rest] = fullName.split(" ");
          const lastName = rest.join(" ") || firstName || "";

          const VALID_SECTORS = new Set([
            "cipia", "haccp", "medical", "avocats", "experts-comptables",
          ]);
          const rawSector = session.metadata?.sector_id || "cipia";
          const sectorId = VALID_SECTORS.has(rawSector) ? rawSector : "cipia";
          const customerId = session.customer as string;

          // Date d'expiration : NULL pour phase 1 (lifetime), +5 ans pour phase 2
          const founderUntilSql = phase === 2 ? "date('now', '+5 years')" : "NULL";

          // Transaction atomique : empêche la race condition idempotence
          // (UNIQUE INDEX partiel sur founder_stripe_session_id en DB → 2e webhook simultané throw)
          let userId2: number = 0;
          let isNewUser = false;
          try {
            db.transaction(() => {
              // Recheck idempotence dans la transaction (le UNIQUE INDEX bloquerait sinon)
              const existing = db
                .prepare("SELECT id FROM users WHERE founder_stripe_session_id = ?")
                .get(sessionId) as { id: number } | undefined;
              if (existing) {
                userId2 = existing.id;
                return;
              }

              const existingUser = db
                .prepare("SELECT id FROM users WHERE email = ?")
                .get(email) as { id: number } | undefined;

              if (existingUser) {
                // Upgrade le user existant en founder
                userId2 = existingUser.id;
                db.prepare(`
                  UPDATE users
                  SET plan = 'founder',
                      founder_phase = ?,
                      founder_purchased_at = datetime('now'),
                      founder_until_date = ${founderUntilSql},
                      founder_stripe_session_id = ?,
                      stripe_customer_id = ?,
                      active_sector_id = ?
                  WHERE id = ?
                `).run(phase, sessionId, customerId, sectorId, userId2);
                // Pas de magic link nécessaire : user a déjà un mot de passe
              } else {
                // Crée le user en mode "password pending" (set_password=0)
                const result = db.prepare(`
                  INSERT INTO users (
                    email, password_hash, first_name, last_name,
                    plan, founder_phase, founder_purchased_at,
                    founder_until_date, founder_stripe_session_id,
                    stripe_customer_id, active_sector_id, password_set
                  ) VALUES (?, '', ?, ?, 'founder', ?, datetime('now'), ${founderUntilSql}, ?, ?, ?, 0)
                `).run(
                  email,
                  firstName.trim() || "Founder",
                  lastName.trim() || "Cipia",
                  phase,
                  sessionId,
                  customerId,
                  sectorId,
                );
                userId2 = Number(result.lastInsertRowid);
                isNewUser = true;
              }

              // Inscrit au secteur (table user_sectors)
              db.prepare(`
                INSERT OR IGNORE INTO user_sectors (user_id, sector_id, is_primary)
                VALUES (?, ?, 1)
              `).run(userId2, sectorId);
            })();
          } catch (txErr: unknown) {
            const msg = txErr instanceof Error ? txErr.message : String(txErr);
            // SQLITE_CONSTRAINT_UNIQUE → un autre webhook concurrent a déjà créé le user
            if (msg.includes("UNIQUE constraint failed")) {
              console.log(`Founder webhook: race detected on session ${sessionId} — idempotent skip`);
              releaseFounderReservation(sessionId);
              break;
            }
            throw txErr;
          }

          // Libère la réservation (TOCTOU protection)
          releaseFounderReservation(sessionId);

          // Envoi du magic link d'activation pour les nouveaux comptes Founder
          // (les comptes upgradés conservent leur mot de passe existant)
          if (isNewUser && userId2) {
            try {
              const link = createMagicLink(userId2, "set_password");
              const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cipia.fr";
              const activationUrl = `${baseUrl}/connexion/activer?token=${encodeURIComponent(link.token)}`;
              await sendFounderActivationEmail(email, activationUrl, firstName.trim() || "Founder");
            } catch (emailErr) {
              console.error(
                `Founder webhook: failed to send activation email for user ${userId2}`,
                emailErr
              );
              // On ne bloque pas le webhook : Stéphane peut renvoyer le lien manuellement.
            }
          }

          // Log structuré sans PII complet (RGPD : on garde seulement le domaine)
          console.log(
            `Founder webhook: phase=${phase} userId=${userId2} sector=${sectorId} domain=${email.split("@")[1] || "unknown"} new=${isNewUser}`
          );
        }
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        // Libère la réservation pour rouvrir la place (TOCTOU recovery)
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.metadata?.founder_phase) {
          releaseFounderReservation(session.id);
        }
        break;
      }

      case "charge.refunded":
      case "charge.dispute.created": {
        // Refund = rétrograde le user en plan='free' + libère sa place
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent = charge.payment_intent as string;
        if (!paymentIntent) break;
        // Retrouve la session checkout liée au PaymentIntent
        const sessions = await getStripe().checkout.sessions.list({
          payment_intent: paymentIntent,
          limit: 1,
        });
        const sessionId = sessions.data[0]?.id;
        if (!sessionId) {
          console.warn(`Refund: pas de session trouvée pour PI ${paymentIntent}`);
          break;
        }
        // Trouve le user via founder_stripe_session_id
        const user = db
          .prepare(
            "SELECT id, plan, founder_phase FROM users WHERE founder_stripe_session_id = ?"
          )
          .get(sessionId) as
          | { id: number; plan: string; founder_phase: number | null }
          | undefined;
        if (!user) break;
        // Rétrograde + libère la place
        db.prepare(`
          UPDATE users
          SET plan = 'free',
              founder_phase = NULL,
              founder_purchased_at = NULL,
              founder_until_date = NULL,
              founder_stripe_session_id = NULL
          WHERE id = ?
        `).run(user.id);
        console.log(
          `Refund: user ${user.id} rétrogradé (était phase=${user.founder_phase})`
        );
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

    // Marque l'event comme traité après le switch (commit-after-work).
    // Permet le retry si on a return 500 dans le switch (ex: email manquant).
    markEventProcessed(event.id, event.type);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
