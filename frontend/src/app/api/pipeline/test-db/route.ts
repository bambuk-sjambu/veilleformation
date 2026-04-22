import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { database_url } = await req.json();

  if (!database_url || database_url.includes(":@")) {
    return NextResponse.json({ ok: false, message: "URL incomplète (mot de passe manquant ?)" });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: database_url, connectionTimeoutMillis: 5000 });
    const result = await pool.query("SELECT version()");
    await pool.end();
    const version = (result.rows[0].version as string).split(" ").slice(0, 2).join(" ");
    return NextResponse.json({ ok: true, message: version });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: msg.split("\n")[0] });
  }
}
