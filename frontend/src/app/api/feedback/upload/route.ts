import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { getDb, dbExists } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

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
    .prepare("SELECT is_feedback_panel FROM users WHERE id = ?")
    .get(user.userId) as { is_feedback_panel: number | null } | undefined;

  if (!userRow || Number(userRow.is_feedback_panel) !== 1) {
    return NextResponse.json(
      { error: "Vous ne faites pas partie du panel feedback" },
      { status: 403 }
    );
  }

  // Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = formData.get("screenshot") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  // Validation MIME
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Type de fichier non autorise (png/jpeg/webp uniquement)" },
      { status: 400 }
    );
  }

  // Validation taille
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5 Mo)" },
      { status: 400 }
    );
  }

  // Dossier de stockage
  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "feedback-screenshots"
  );
  if (!existsSync(uploadsDir)) {
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      console.error("mkdir feedback-screenshots failed:", e);
      return NextResponse.json(
        { error: "Erreur creation dossier" },
        { status: 500 }
      );
    }
  }

  // Nom de fichier UUID + extension correcte
  const ext = EXT_BY_MIME[file.type] || "png";
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
  } catch (e) {
    console.error("writeFile failed:", e);
    return NextResponse.json(
      { error: "Erreur ecriture fichier" },
      { status: 500 }
    );
  }

  const url = `/feedback-screenshots/${filename}`;
  return NextResponse.json({ url });
}
