import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEmail, subscribeConfirmationEmail } from "@/lib/resend";

interface SubscribeRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  website?: string; // honeypot
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();
    const { email, firstName, lastName, website } = body;

    if (website && website.trim() !== "") {
      return NextResponse.json({ success: true, message: "Inscription reussie" });
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();

    const existing = db
      .prepare("SELECT id FROM subscribers WHERE email = ?")
      .get(normalizedEmail) as { id: number } | undefined;

    if (existing) {
      return NextResponse.json({ success: true, message: "Vous etes deja inscrit !" });
    }

    db.prepare(`
      INSERT INTO subscribers (email, first_name, last_name)
      VALUES (?, ?, ?)
    `).run(normalizedEmail, firstName || null, lastName || null);

    try {
      const mail = subscribeConfirmationEmail({ firstName });
      await sendEmail({ to: normalizedEmail, ...mail });
    } catch (e) {
      console.error("Subscribe confirmation email failed:", e);
    }

    return NextResponse.json({ success: true, message: "Inscription reussie" });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
