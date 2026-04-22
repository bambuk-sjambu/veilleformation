import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { spreadsheet_id, sheet_name } = await req.json();

  if (!spreadsheet_id) {
    return NextResponse.json({ ok: false, message: "Spreadsheet ID manquant" });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { google } = require("googleapis");
    const credPath = process.env.GOOGLE_SHEETS_CREDENTIALS ||
      "../blog-automation-pipeline-BDD/credentials.json";

    const auth = new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId: spreadsheet_id });
    const sheetNames = response.data.sheets.map((s: { properties?: { title?: string } }) => s.properties?.title);
    const found = sheetNames.includes(sheet_name);

    if (!found) {
      return NextResponse.json({
        ok: false,
        message: `Onglet "${sheet_name}" introuvable. Onglets disponibles : ${sheetNames.join(", ")}`,
      });
    }

    return NextResponse.json({ ok: true, message: `Onglet "${sheet_name}" trouvé` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: msg.split("\n")[0] });
  }
}
