import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { getDb } from "@/lib/db";
import {
  getActiveSectorIdForUser,
  getUserSectors,
  DEFAULT_SECTOR_ID,
} from "@/lib/sector-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    redirect("/connexion");
  }

  let avatarUrl: string | null = null;
  let isFeedbackPanel = false;
  try {
    const row = getDb()
      .prepare(
        "SELECT avatar_url, is_feedback_panel FROM users WHERE id = ?"
      )
      .get(user.userId) as
      | { avatar_url: string | null; is_feedback_panel: number | null }
      | undefined;
    avatarUrl = row?.avatar_url || null;
    isFeedbackPanel = Number(row?.is_feedback_panel) === 1;
  } catch {
    // ignore si colonne pas encore creee
  }

  const activeSectorId =
    getActiveSectorIdForUser(user.userId) || DEFAULT_SECTOR_ID;
  const userSectors = getUserSectors(user.userId);

  return (
    <DashboardShell
      firstName={user.firstName || ""}
      lastName={user.lastName || ""}
      avatarUrl={avatarUrl}
      isFeedbackPanel={isFeedbackPanel}
      activeSectorId={activeSectorId}
      userSectors={userSectors.map((s) => ({
        sector_id: s.sector_id,
        is_primary: s.is_primary,
      }))}
    >
      {children}
    </DashboardShell>
  );
}
