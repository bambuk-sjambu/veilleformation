import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="font-semibold text-gray-300">Cipia</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <BarChart3 className="w-4 h-4" />
            <span>45 000 OF certifiés Qualiopi en France</span>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; 2026 Cipia &mdash; Haruna SARL</p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link href="/politique-donnees" className="hover:text-white transition-colors">
              Politique données
            </Link>
            <Link href="/cgu" className="hover:text-white transition-colors">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-white transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
