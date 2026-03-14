import Link from "next/link";

export const metadata = {
  title: "Mentions légales | VeilleFormation.fr",
  description: "Mentions légales du service VeilleFormation.fr",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Mentions légales
          </h1>

          <section className="space-y-6 text-gray-600">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Éditeur du service
              </h2>
              <p>
                Le service VeilleFormation.fr est édité par :
              </p>
              <ul className="mt-2 space-y-1">
                <li><strong>Raison sociale :</strong> SJA Digital</li>
                <li><strong>Forme juridique :</strong> Entreprise individuelle</li>
                <li><strong>Siège social :</strong> France</li>
                <li><strong>SIRET :</strong> [à compléter]</li>
                <li><strong>Email :</strong> contact@veilleformation.fr</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Directeur de la publication
              </h2>
              <p>
                Stéphane Jambu, en qualité de gérant de SJA Digital.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Hébergement
              </h2>
              <ul className="space-y-1">
                <li><strong>Frontend :</strong> Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA</li>
                <li><strong>Backend :</strong> PythonAnywhere, UK</li>
                <li><strong>Base de données :</strong> SQLite (hébergement PythonAnywhere)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Propriété intellectuelle
              </h2>
              <p>
                L&apos;ensemble des contenus présents sur VeilleFormation.fr (textes, images, graphismes, logo, icônes, etc.)
                sont la propriété exclusive de SJA Digital, à l&apos;exception des marques, logos ou contenus appartenant
                à d&apos;autres sociétés partenaires ou auteurs.
              </p>
              <p className="mt-2">
                Toute reproduction, distribution, modification, adaptation, retransmission ou publication,
                même partielle, de ces différents éléments est strictement interdite sans l&apos;accord exprès par écrit de SJA Digital.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Données personnelles
              </h2>
              <p>
                Le traitement des données personnelles est décrit dans notre{" "}
                <Link href="/confidentialite" className="text-primary hover:underline">
                  Politique de confidentialité
                </Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Cookies
              </h2>
              <p>
                Ce site utilise des cookies à des fins de statistiques anonymes via Plausible.
                Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.
                Vous pouvez refuser les cookies en modifiant les paramètres de votre navigateur.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Contact
              </h2>
              <p>
                Pour toute question concernant ces mentions légales, vous pouvez nous contacter à :
              </p>
              <ul className="mt-2 space-y-1">
                <li><strong>Email :</strong> contact@veilleformation.fr</li>
                <li><strong>Formulaire :</strong> Via notre page de contact</li>
              </ul>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Dernière mise à jour : Mars 2026
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-primary hover:underline"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
