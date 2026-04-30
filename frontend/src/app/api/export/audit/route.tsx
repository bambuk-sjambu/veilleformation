import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { getDb, dbExists, DbArticle, DbAction, DbUserProfile } from "@/lib/db";
import { AuditPDF } from "@/lib/audit-pdf";
import { canExport, logExport } from "@/lib/plan";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!dbExists()) {
      return NextResponse.json({ error: "Base non initialisee" }, { status: 500 });
    }

    // Check export limits
    const exportCheck = canExport(session.userId);
    if (!exportCheck.allowed) {
      return NextResponse.json(
        { error: exportCheck.reason || "Limite d'exports atteinte" },
        { status: 403 }
      );
    }

    const db = getDb();
    const params = request.nextUrl.searchParams;

    const dateStart = params.get("date_start") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateEnd = params.get("date_end") || new Date().toISOString().split("T")[0];

    // Get profile
    let profile: DbUserProfile | null = null;
    try {
      profile = db
        .prepare("SELECT * FROM user_profiles WHERE user_id = ?")
        .get(session.userId) as DbUserProfile | undefined || null;
    } catch {
      // Table doesn't exist yet
    }

    // Get articles in date range.
    // Refactor multi-secteur A.4.c : on selectionne aussi taxonomy_indicators
    // (nouvelle colonne) ; le PDF preferera celle-ci avec fallback sur
    // qualiopi_indicators.
    const articles = db
      .prepare(`
        SELECT id, title, source, category, published_date, summary, impact_level,
               qualiopi_indicators, taxonomy_indicators, collected_at
        FROM articles
        WHERE date(collected_at) >= date(?) AND date(collected_at) <= date(?)
        ORDER BY collected_at DESC
        LIMIT 100
      `)
      .all(dateStart, dateEnd) as DbArticle[];

    // Get actions
    let actions: DbAction[] = [];
    try {
      actions = db
        .prepare(`
          SELECT a.*
          FROM actions a
          JOIN articles ar ON a.article_id = ar.id
          WHERE date(ar.collected_at) >= date(?) AND date(ar.collected_at) <= date(?)
          ORDER BY a.created_at DESC
        `)
        .all(dateStart, dateEnd) as DbAction[];
    } catch {
      // Table doesn't exist yet
    }

    // Generate PDF
    const pdfStream = await renderToStream(
      <AuditPDF
        profile={profile}
        articles={articles}
        actions={actions}
        dateStart={dateStart}
        dateEnd={dateEnd}
      />
    );

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Log the export
    logExport(session.userId, articles.length);

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="audit-qualiopi-${dateStart}-${dateEnd}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la generation du PDF" },
      { status: 500 }
    );
  }
}
