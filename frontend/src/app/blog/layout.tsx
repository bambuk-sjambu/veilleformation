import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import BlogPublicHeader from "@/components/BlogPublicHeader";
import { getDb } from "@/lib/db";

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user?.isLoggedIn) {
    let avatarUrl: string | null = null;
    try {
      const row = getDb()
        .prepare("SELECT avatar_url FROM users WHERE id = ?")
        .get(user.userId) as { avatar_url: string | null } | undefined;
      avatarUrl = row?.avatar_url || null;
    } catch {}

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

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogPublicHeader />
      {children}
    </div>
  );
}
