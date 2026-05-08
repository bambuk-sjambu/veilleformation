import { NextRequest, NextResponse } from "next/server";
import { getDb, dbExists } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisée" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Allowlist stricte MIME — refuse SVG (XSS via <script>) et tout fichier
    // non-image bitmap. Le MIME annoncé par le client est vérifié + magic bytes.
    const ALLOWED_MIME_TO_EXT: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };
    const ext = ALLOWED_MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Format non supporté. PNG, JPEG ou WebP uniquement." },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 2 Mo" }, { status: 400 });
    }

    // Lit les bytes pour vérifier les magic bytes (defense-in-depth contre MIME spoof)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const magicBytesValid =
      (file.type === "image/png" &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ||
      (file.type === "image/jpeg" &&
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      (file.type === "image/webp" &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50);
    if (!magicBytesValid) {
      return NextResponse.json(
        { error: "Le contenu du fichier ne correspond pas à son type déclaré." },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Filename généré server-side avec extension dérivée du MIME (jamais de file.name)
    const filename = `user-${session.userId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Generate URL
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update database
    const db = getDb();

    // Check if avatar_url column exists
    const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const columnNames = columns.map(c => c.name);

    if (columnNames.includes("avatar_url")) {
      db.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, session.userId);
    }

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
