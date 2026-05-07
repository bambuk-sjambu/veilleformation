import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  setActiveSectorForUser,
  userHasSector,
} from "@/lib/sector-context";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  let body: { sectorId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const sectorId = (body.sectorId || "").trim();
  if (!sectorId) {
    return NextResponse.json({ error: "sectorId requis" }, { status: 400 });
  }

  if (!userHasSector(user.userId, sectorId)) {
    return NextResponse.json(
      { error: "Vous n'avez pas accès à ce secteur." },
      { status: 403 }
    );
  }

  const ok = setActiveSectorForUser(user.userId, sectorId);
  if (!ok) {
    return NextResponse.json(
      { error: "Impossible de basculer sur ce secteur." },
      { status: 500 }
    );
  }

  return NextResponse.json({ activeSectorId: sectorId });
}
