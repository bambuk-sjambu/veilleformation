import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Merci pour votre inscription | Cipia",
  robots: "noindex, nofollow", // Don't index this page
};

export default function MerciPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Merci pour votre inscription !
          </h1>

          <p className="text-gray-600 mb-6">
            Vous recevrez votre premiere newsletter Cipia
            chaque mardi a 8h00.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Important :</strong> Verifiez votre boite de reception et
              ajoutez <span className="font-mono">@cipia.fr</span> a
              vos contacts pour ne pas manquer nos emails.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
          >
            Retour a l&apos;accueil
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Des questions ? Contactez-nous a{" "}
          <a
            href="mailto:contact@cipia.fr"
            className="text-primary hover:underline"
          >
            contact@cipia.fr
          </a>
        </p>
      </div>
    </div>
  );
}
