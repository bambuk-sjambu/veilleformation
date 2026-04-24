import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { getDb } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion");
  }

  let avatarUrl: string | null = null;
  try {
    const row = getDb()
      .prepare("SELECT avatar_url FROM users WHERE id = ?")
      .get(user.userId) as { avatar_url: string | null } | undefined;
    avatarUrl = row?.avatar_url || null;
  } catch {
    // ignore si colonne pas encore creee
  }

  return (
    <DashboardShell
      firstName={user.firstName || ""}
      lastName={user.lastName || ""}
      avatarUrl={avatarUrl}
    >
      {children}
    </DashboardShell>
  );
}
