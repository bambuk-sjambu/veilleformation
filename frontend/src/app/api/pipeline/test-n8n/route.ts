import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { webhook_url } = await req.json();

  if (!webhook_url || !webhook_url.startsWith("http")) {
    return NextResponse.json({ ok: false, message: "URL invalide" });
  }

  try {
    // Ping simple — on vérifie juste que le serveur répond
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(webhook_url + "?ping=1", {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // n8n retourne 200 ou 404 si le workflow existe mais sans params valides
    // L'important est que le serveur réponde
    if (res.status < 500) {
      return NextResponse.json({ ok: true, message: `Serveur n8n joignable (HTTP ${res.status})` });
    }
    return NextResponse.json({ ok: false, message: `Erreur serveur n8n (HTTP ${res.status})` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      return NextResponse.json({ ok: false, message: "Timeout — serveur n8n injoignable" });
    }
    return NextResponse.json({ ok: false, message: msg.split("\n")[0] });
  }
}
