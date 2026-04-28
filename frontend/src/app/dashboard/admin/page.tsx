import { getCurrentUser } from "@/lib/auth";
import { getDb, dbExists } from "@/lib/db";
import { isSuperAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    redirect("/connexion");
  }

  // Re-check serveur — pas bypassable cote client
  if (!dbExists()) {
    redirect("/dashboard");
  }
  const db = getDb();
  if (!isSuperAdmin(user.userId, db)) {
    redirect("/dashboard");
  }

  return <AdminDashboard />;
}
