import { Metadata } from "next";
import Link from "next/link";
import path from "path";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exemple de newsletter Cipia — Veille Qualiopi",
  description:
    "Découvrez à quoi ressemble la newsletter hebdomadaire Cipia : décrets formation, appels d'offres OPCO, veille métiers — triés par IA, format prêt audit Qualiopi.",
  alternates: { canonical: "https://cipia.fr/exemple-newsletter/" },
  openGraph: {
    title: "Exemple de newsletter Cipia",
    description: "Décrets, AAP, veille métiers — triés par IA, format prêt audit Qualiopi.",
    url: "https://cipia.fr/exemple-newsletter/",
  },
  robots: { index: true, follow: true },
};

interface Newsletter {
  id: number;
  edition_number: number;
  subject: string;
  html_content: string;
  week_start: string | null;
  week_end: string | null;
  articles_total: number;
  sent_at: string | null;
}

function getLatestNewsletter(): Newsletter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.cwd(), "..", "data", "veille.db");
    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare(
        `SELECT id, edition_number, subject, html_content, week_start, week_end, articles_total, sent_at
         FROM newsletters
         WHERE html_content IS NOT NULL AND length(html_content) > 1000
         ORDER BY id DESC LIMIT 1`
      )
      .get() as Newsletter | undefined;
    db.close();
    return row || null;
  } catch (e) {
    console.error("getLatestNewsletter error:", e);
    return null;
  }
}

export default async function ExempleNewsletterPage() {
  const newsletter = getLatestNewsletter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-bold text-lg text-gray-900">Cipia</span>
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Exemple de newsletter Cipia</h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Voici à quoi ressemble la newsletter que vous recevez chaque mardi à 8h. Décrets, appels
            d&apos;offres, veille métiers — triés par IA, format prêt audit Qualiopi.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {newsletter ? (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  Édition #{newsletter.edition_number} — {newsletter.subject}
                </p>
                {newsletter.week_start && newsletter.week_end && (
                  <p className="text-gray-500">
                    Semaine du {newsletter.week_start} au {newsletter.week_end}
                    {newsletter.articles_total ? ` · ${newsletter.articles_total} articles sélectionnés` : null}
                  </p>
                )}
              </div>
            </div>

            {/* Newsletter HTML rendu, encadré comme un email client */}
            <div className="bg-gray-100 rounded-lg p-4 sm:p-8">
              <div
                className="newsletter-render bg-white rounded-lg shadow-md mx-auto overflow-hidden"
                style={{ maxWidth: 640 }}
                dangerouslySetInnerHTML={{ __html: newsletter.html_content }}
              />
            </div>

            {/* CTA */}
            <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Convaincu ? Démarrez 14 jours d&apos;essai gratuit
              </h2>
              <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                Vous recevrez la prochaine édition mardi prochain à 8h, accès complet au dashboard,
                annulation en un clic. Sans engagement.
              </p>
              <Link
                href="/inscription"
                className="inline-block bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-lg hover:bg-yellow-300 transition"
              >
                Démarrer mes 14 jours →
              </Link>
              <p className="text-xs text-gray-500 mt-4">
                CB requise · Tarif lancement -30% · 3 clics pour annuler
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">
              Première édition en cours de préparation. Revenez mardi prochain ou{" "}
              <Link href="/inscription" className="text-blue-600 underline">
                inscrivez-vous pour la recevoir directement
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
