import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Merci — Beta HACCP Cipia",
  robots: "noindex, nofollow",
};

export default function HaccpBetaMerciPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Merci, c&apos;est noté.
          </h1>

          <p className="text-gray-600 mb-6">
            On revient vers vous début septembre, dès l&apos;ouverture de la
            beta Cipia HACCP. Vous serez parmi les premiers à tester.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-900">
              <strong>Astuce :</strong> ajoutez{" "}
              <span className="font-mono">@cipia.fr</span> à vos contacts pour
              ne pas manquer notre email d&apos;ouverture.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
