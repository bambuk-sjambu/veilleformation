import Link from "next/link";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";
import { getSectorMeta } from "@/lib/sector-meta";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bienvenue chez les Founders Cipia",
  robots: "noindex, nofollow",
};

export default async function FoundersMerciPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const meta = getSectorMeta("cipia");

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: `linear-gradient(180deg, ${meta.surface} 0%, white 100%)`,
      }}
    >
      <div className="w-full max-w-xl text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: meta.primary }}
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          Bienvenue chez les Founders 🎉
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Votre paiement est validé. Vous faites partie des fondateurs Cipia OF
          Qualiopi.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 text-left">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: meta.primary }} />
            Prochaines étapes
          </h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
                style={{ backgroundColor: meta.primary }}
              >
                1
              </span>
              <span>
                <strong>Vérifiez votre boîte mail</strong> dans les 5 prochaines
                minutes. Vous recevez votre facture PDF + un lien pour activer
                votre compte (choix du mot de passe).
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
                style={{ backgroundColor: meta.primary }}
              >
                2
              </span>
              <span>
                <strong>Connectez-vous au dashboard</strong> et explorez votre
                veille Qualiopi automatisée. Première newsletter le mardi qui
                suit votre inscription.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
                style={{ backgroundColor: meta.primary }}
              >
                3
              </span>
              <span>
                <strong>Auditez votre veille en 1 clic</strong> via /dashboard/export
                — PDF prêt pour votre prochain audit Qualiopi.
              </span>
            </li>
          </ol>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Vous n&apos;avez pas reçu l&apos;email ? Vérifiez vos spams puis
          contactez{" "}
          <a href="mailto:contact@cipia.fr" style={{ color: meta.primaryDark }} className="underline font-medium">
            contact@cipia.fr
          </a>
          {sessionId ? (
            <>
              <br />
              <span className="text-xs text-gray-400">
                Référence Stripe : {sessionId.slice(0, 20)}…
              </span>
            </>
          ) : null}
        </p>

        <Link
          href="/connexion"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: meta.primary }}
        >
          Aller à la connexion
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  );
}
