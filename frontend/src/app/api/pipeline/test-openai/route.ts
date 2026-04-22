import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { api_key } = await req.json();

  if (!api_key || !api_key.startsWith("sk-")) {
    return NextResponse.json({ ok: false, message: "Clé invalide (doit commencer par sk-)" });
  }

  try {
    // Appel minimal : liste des modèles (très rapide, ne consomme pas de tokens)
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${api_key}` },
    });

    if (res.ok) {
      return NextResponse.json({ ok: true, message: "Clé valide" });
    }
    const data = await res.json();
    return NextResponse.json({
      ok: false,
      message: data?.error?.message || `HTTP ${res.status}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: msg });
  }
}
