import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardStats from "@/components/DashboardStats";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion");
  }

  return (
    <DashboardStats firstName={user.firstName || ""} />
  );
}
