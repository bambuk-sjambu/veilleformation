import Link from "next/link";
import { sector } from "@/config";

export default function BlogPublicHeader() {
  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              {sector.brand.name}
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/connexion" className="text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition"
              >
                Inscription
              </Link>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600">
                Accueil
              </Link>
            </li>
            <li>
              <span>/</span>
            </li>
            <li className="text-gray-900 font-medium">Blog</li>
          </ol>
        </div>
      </nav>
    </>
  );
}
