"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  FileSearch,
  Megaphone,
  Mail,
  ClipboardList,
  Settings,
  LogOut,
  ChevronDown,
  User,
  CreditCard,
  Upload,
  BookOpen,
  FileDown,
  MoreHorizontal,
} from "lucide-react";

const primaryNav = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/veille", label: "Veille", icon: FileSearch },
  { href: "/dashboard/appels-offres", label: "Appels d'offres", icon: Megaphone },
  { href: "/dashboard/plan-action", label: "Plan d'action", icon: ClipboardList },
  { href: "/dashboard/newsletter", label: "Newsletter", icon: Mail },
];

const secondaryNav = [
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/dashboard/import", label: "Importer", icon: Upload },
  { href: "/dashboard/export", label: "Export PDF", icon: FileDown },
];

const accountNav = [
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];

export default function DashboardShell({
  children,
  firstName,
  lastName,
}: {
  children: React.ReactNode;
  firstName: string;
  lastName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
  }

  const initials =
    (firstName?.[0] || "").toUpperCase() + (lastName?.[0] || "").toUpperCase();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-bold text-lg text-gray-900 hidden sm:inline">
                  Cipia
                </span>
              </Link>
            </div>

            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                  {initials || <User className="w-4 h-4" />}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">
                  {firstName} {lastName}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {accountNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setUserOpen(false)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Icon className="w-4 h-4 text-gray-400" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4 text-gray-400" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-stretch -mb-px">
            <nav className="flex gap-1 overflow-x-auto flex-1">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative flex-shrink-0" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors h-full ${
                  secondaryNav.some((n) => isActive(n.href))
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>Plus</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {secondaryNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 ${
                          isActive(item.href) ? "text-primary" : "text-gray-700"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-gray-400" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
