import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import BlogPublicHeader from "@/components/BlogPublicHeader";

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user?.isLoggedIn) {
    return (
      <DashboardShell firstName={user.firstName || ""} lastName={user.lastName || ""}>
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
