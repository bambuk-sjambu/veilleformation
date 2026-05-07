import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserSectors,
  getActiveSectorIdForUser,
  DEFAULT_SECTOR_ID,
} from "@/lib/sector-context";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const sectors = getUserSectors(user.userId);
  const activeSectorId =
    getActiveSectorIdForUser(user.userId) || DEFAULT_SECTOR_ID;

  return NextResponse.json({
    activeSectorId,
    sectors,
  });
}
