import { Brain, BellRing, BookOpen, Shield } from "lucide-react";
import HaccpSignupForm from "./HaccpSignupForm";

export const metadata = {
  title: "Cipia HACCP — Beta gratuite (mai 2026)",
  description:
    "Veille réglementaire IA pour restaurateurs, boulangers, traiteurs et industriels agroalimentaires. Décrets DGAL, alertes RASFF, GBPH classés par IA Anthropic Claude. 19€/an.",
  robots: "noindex, nofollow",
};

export default function HaccpBetaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold mb-6 uppercase tracking-wide">
              Beta gratuite — mai 2026
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Cipia arrive sur <span className="text-primary">HACCP</span>.
              <br />
              Inscrivez-vous gratuitement pour la beta de mai.
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Veille réglementaire IA pour restaurateurs, boulangers, traiteurs
              et industriels agroalimentaires.
              <br />
              <strong className="text-gray-900">19€/an.</strong>
            </p>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-10">
              <HaccpSignupForm />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mt-4">
            <div className="p-5 rounded-xl bg-white border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Décrets DGAL</h3>
              <p className="text-sm text-gray-600">
                Tous les arrêtés et notes de service de la Direction générale
                de l&apos;alimentation, dès leur publication.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <BellRing className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Alertes RASFF</h3>
              <p className="text-sm text-gray-600">
                Le système d&apos;alerte rapide européen, filtré sur votre
                secteur et vos ingrédients.
              </p>
            </div>
            <div className="p-5 rounded-xl bg-white border border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">GBPH classés IA</h3>
              <p className="text-sm text-gray-600">
                Bonnes pratiques d&apos;hygiène analysées et résumées par
                l&apos;IA Anthropic Claude.
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield className="w-4 h-4 text-primary" />
            <span>Hébergé en France · RGPD compliant · Désinscription 1 clic</span>
          </div>
        </div>
      </section>
    </main>
  );
}
