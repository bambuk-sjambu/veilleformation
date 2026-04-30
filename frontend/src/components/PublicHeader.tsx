import Link from "next/link";
import { sector } from "@/config";

export default function PublicHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{sector.brand.name.charAt(0)}</span>
            </div>
            <span className="font-bold text-lg text-gray-900">{sector.brand.name}</span>
          </Link>
          <Link
            href="/connexion"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-dark transition-colors"
          >
            Connexion
          </Link>
        </div>
      </div>
    </header>
  );
}
