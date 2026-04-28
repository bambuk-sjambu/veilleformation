import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getDb, dbExists } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["bug", "manque", "suggestion", "confus"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

interface FeedbackBody {
  category?: string;
  page?: string;
  rating?: number | null;
  text?: string;
  screenshot_url?: string | null;
}

interface UserRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_feedback_panel: number | null;
}

/**
 * Lit les credentials Telegram depuis env vars ou /etc/cipia.env (best effort).
 */
function getTelegramCreds(): { token: string; chatId: string } | null {
  let token = process.env.TELEGRAM_BOT_TOKEN || "";
  let chatId = process.env.TELEGRAM_CHAT_ID || "";

  if (!token || !chatId) {
    try {
      if (fs.existsSync("/etc/cipia.env")) {
        const content = fs.readFileSync("/etc/cipia.env", "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx < 0) continue;
          const key = trimmed.substring(0, eqIdx).trim();
          let value = trimmed.substring(eqIdx + 1).trim();
          // Strip surrounding quotes
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (key === "TELEGRAM_BOT_TOKEN" && !token) token = value;
          if (key === "TELEGRAM_CHAT_ID" && !chatId) chatId = value;
        }
      }
    } catch {
      // ignore lecture echouee
    }
  }

  if (!token || !chatId) return null;
  return { token, chatId };
}

async function notifyTelegram(message: string): Promise<void> {
  const creds = getTelegramCreds();
  if (!creds) return;
  try {
    const url = `https://api.telegram.org/bot${creds.token}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: creds.chatId,
        text: message,
        disable_web_page_preview: true,
      }),
      // 5s timeout via AbortSignal
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("Telegram notification failed:", e);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (!dbExists()) {
    return NextResponse.json({ error: "Base indisponible" }, { status: 503 });
  }

  const db = getDb();

  // Verifier is_feedback_panel = 1
  const userRow = db
    .prepare(
      "SELECT id, email, first_name, last_name, is_feedback_panel FROM users WHERE id = ?"
    )
    .get(user.userId) as UserRow | undefined;

  if (!userRow) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (Number(userRow.is_feedback_panel) !== 1) {
    return NextResponse.json(
      { error: "Vous ne faites pas partie du panel feedback" },
      { status: 403 }
    );
  }

  // Parse body
  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const category = (body.category || "").trim();
  const page = (body.page || "").trim();
  const text = (body.text || "").trim();
  const rawRating = body.rating;
  const screenshotUrl = body.screenshot_url ? String(body.screenshot_url).trim() : null;

  // Validation
  if (!VALID_CATEGORIES.includes(category as Category)) {
    return NextResponse.json(
      { error: `Categorie invalide (attendu : ${VALID_CATEGORIES.join(", ")})` },
      { status: 400 }
    );
  }
  if (!page || page.length > 200) {
    return NextResponse.json(
      { error: "Page manquante ou trop longue" },
      { status: 400 }
    );
  }
  if (!text || text.length < 10 || text.length > 1000) {
    return NextResponse.json(
      { error: "Le texte doit faire entre 10 et 1000 caracteres" },
      { status: 400 }
    );
  }

  let rating: number | null = null;
  if (rawRating !== undefined && rawRating !== null && rawRating !== 0) {
    const n = Number(rawRating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: "Note invalide (1-5 ou null)" },
        { status: 400 }
      );
    }
    rating = n;
  }

  if (screenshotUrl && screenshotUrl.length > 500) {
    return NextResponse.json(
      { error: "URL screenshot trop longue" },
      { status: 400 }
    );
  }

  // INSERT
  let feedbackId: number;
  try {
    const result = db
      .prepare(
        `INSERT INTO feedbacks
           (user_id, category, page, rating, text, screenshot_url, status)
         VALUES (?, ?, ?, ?, ?, ?, 'nouveau')`
      )
      .run(user.userId, category, page, rating, text, screenshotUrl);
    feedbackId = Number(result.lastInsertRowid);
  } catch (e) {
    console.error("Feedback INSERT failed:", e);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement" },
      { status: 500 }
    );
  }

  // Notification Telegram (best effort)
  try {
    const truncated = text.length > 200 ? text.slice(0, 200) + "..." : text;
    const fullName = `${userRow.first_name || ""} ${userRow.last_name || ""}`.trim();
    const ratingLine = rating ? `\nNote : ${rating}/5` : "";
    const message =
      `🔔 Nouveau feedback Cipia\n` +
      `De : ${fullName} (${userRow.email})\n` +
      `Page : ${page}\n` +
      `Type : ${category}` +
      ratingLine +
      `\n\n${truncated}\n\n` +
      `Voir : https://cipia.fr/dashboard/admin#feedback`;
    await notifyTelegram(message);
  } catch (e) {
    console.error("Telegram block error (non bloquant):", e);
  }

  return NextResponse.json({ ok: true, id: feedbackId });
}
