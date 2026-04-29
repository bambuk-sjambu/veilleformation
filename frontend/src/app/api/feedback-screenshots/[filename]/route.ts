import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { getDb, dbExists } from "@/lib/db";
import { isSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Sert les captures de feedback depuis disque (Next.js next start ne sert pas
// les fichiers ajoutes a public/ apres le build).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Garde-fou path traversal : que des caracteres safe
  if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return NextResponse.json({ error: "Extension non autorisee" }, { status: 400 });
  }

  // Auth : super-admin uniquement. Telegram recoit la photo en bytes (pas
  // par URL) pour eviter d'exposer publiquement des captures sensibles.
  const user = await getCurrentUser();
  if (!user || !user.userId || !dbExists()) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  const db = getDb();
  if (!isSuperAdmin(user.userId, db)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const filepath = path.join(
    process.cwd(),
    "public",
    "feedback-screenshots",
    filename,
  );

  try {
    const s = await stat(filepath);
    if (!s.isFile()) throw new Error("not a file");
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const buffer = await readFile(filepath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
