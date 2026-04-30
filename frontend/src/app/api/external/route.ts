import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { sector } from "@/config";

// GET /api/external - List user's external content
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");

    let query = `
      SELECT ec.*, t.name as team_name
      FROM external_contents ec
      LEFT JOIN teams t ON ec.team_id = t.id
      WHERE ec.user_id = ?
    `;
    const params: any[] = [session.userId];

    if (teamId) {
      // Verify user is member of the team
      const memberCheck = db.prepare(`
        SELECT * FROM team_members WHERE team_id = ? AND user_id = ?
      `).get(teamId, session.userId);
      if (!memberCheck) {
        return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
      }
      query = `
        SELECT ec.*, t.name as team_name
        FROM external_contents ec
        LEFT JOIN teams t ON ec.team_id = t.id
        WHERE ec.team_id = ?
      `;
      params.length = 0;
      params.push(teamId);
    }

    query += " ORDER BY ec.created_at DESC";

    const contents = db.prepare(query).all(...params);
    return NextResponse.json({ contents });
  } catch (error) {
    console.error("Error fetching external content:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/external - Add external content (URL or file)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const db = getDb();
    const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(session.userId) as { plan: string } | undefined;

    // Check plan restrictions for storage
    // Free: no external content, Solo: 100 MB, Equipe: 5 GB, Agence: 50 GB
    if (!user || user.plan === "free") {
      return NextResponse.json({ error: "Fonctionnalité réservée aux abonnés Solo et plus" }, { status: 403 });
    }

    const formData = await request.formData();
    const sourceType = formData.get("source_type") as string;
    const teamId = formData.get("team_id") as string | null;
    const title = formData.get("title") as string;

    if (!sourceType || !title) {
      return NextResponse.json({ error: "Type et titre requis" }, { status: 400 });
    }

    let sourceUrl: string | null = null;
    let fileName: string | null = null;
    let filePath: string | null = null;
    let content: string | null = null;

    if (sourceType === "url") {
      sourceUrl = formData.get("url") as string;
      if (!sourceUrl || !sourceUrl.startsWith("http")) {
        return NextResponse.json({ error: "URL valide requise" }, { status: 400 });
      }
      // In production, fetch and extract content from URL
      // For now, we'll process with AI later
    } else if (sourceType === "file") {
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
      }

      fileName = file.name;

      // Check file size based on plan
      const maxSizeMB = user.plan === "agence" ? 50 : user.plan === "equipe" ? 20 : 5;
      if (file.size > maxSizeMB * 1024 * 1024) {
        return NextResponse.json({ error: `Fichier trop volumineux (max ${maxSizeMB} MB)` }, { status: 400 });
      }

      // Extract text content from file
      if (file.type === "text/plain" || file.type === "application/pdf" || file.type.includes("word")) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === "text/plain") {
          content = buffer.toString("utf-8");
        } else {
          // For PDF/Word, store file and process later
          // In production, use proper PDF/Word extraction libraries
          content = `[Fichier ${file.type} - traitement en cours]`;
        }
      }

      // TODO: Save file to storage (S3, local, etc.)
      filePath = `/uploads/external/${Date.now()}-${fileName}`;
    }

    // Insert content
    const result = db.prepare(`
      INSERT INTO external_contents (user_id, team_id, source_type, source_url, file_name, file_path, title, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.userId,
      teamId ? parseInt(teamId) : null,
      sourceType,
      sourceUrl,
      fileName,
      filePath,
      title,
      content
    );

    const contentId = result.lastInsertRowid;

    // Process with AI (async in production)
    if (content && process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic();
        const indicatorList = sector.taxonomy.indicators
          .map((i) => `${i.id}=${i.promptHint}`)
          .join(", ");
        const indicatorIds = sector.taxonomy.indicators.map((i) => i.id).join(",");
        const aiResponse = await anthropic.messages.create({
          model: "claude-haiku-4-5-20250315",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: `Analyse ce document pour un ${sector.vocab.audience.replace(/s$/, "")} certifie ${sector.vocab.regulatorName}.
            Fournis:
            1. Un resume en 3-5 phrases
            2. Les indicateurs ${sector.vocab.regulatorName} concernes (${indicatorList})
            3. Le niveau d'impact (fort/moyen/faible)
            4. Un score de pertinence de 1 a 10

            Document:
            ${content.substring(0, 10000)}

            Reponds en JSON: {"summary": "...", "indicators": [${indicatorIds.split(",").slice(0, 2).join(",")}], "impact": "moyen", "score": 7}`
          }]
        });

        const aiText = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";
        try {
          const parsed = JSON.parse(aiText);
          db.prepare(`
            UPDATE external_contents SET
              summary = ?,
              qualiopi_indicators = ?,
              impact_level = ?,
              relevance_score = ?,
              processed = 1,
              processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            parsed.summary,
            JSON.stringify(parsed.indicators),
            parsed.impact,
            parsed.score,
            contentId
          );
        } catch {
          // If not valid JSON, store raw response
          db.prepare(`
            UPDATE external_contents SET
              summary = ?,
              processed = 1,
              processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(aiText, contentId);
        }
      } catch (aiError) {
        console.error("AI processing error:", aiError);
        // Continue without AI processing
      }
    }

    const newContent = db.prepare("SELECT * FROM external_contents WHERE id = ?").get(contentId);
    return NextResponse.json({ content: newContent }, { status: 201 });
  } catch (error) {
    console.error("Error creating external content:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
