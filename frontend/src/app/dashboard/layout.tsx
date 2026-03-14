import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/connexion");
  }

  return (
    <DashboardShell
      firstName={user.firstName || ""}
      lastName={user.lastName || ""}
    >
      {children}
    </DashboardShell>
  );
}
