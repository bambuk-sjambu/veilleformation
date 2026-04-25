import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Mentions légales | Cipia",
  description: "Mentions légales du service Cipia édité par Haruna SARL.",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
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
              <p>Le service Cipia est édité par :</p>
              <ul className="mt-2 space-y-1">
                <li><strong>Raison sociale :</strong> Haruna SARL</li>
                <li><strong>Forme juridique :</strong> Société à responsabilité limitée (SARL) de droit français</li>
                <li><strong>Siège social :</strong> 112 avenue de Paris, 94300 Vincennes, France</li>
                <li><strong>RCS :</strong> Créteil 752 912 022</li>
                <li><strong>N° de gestion :</strong> 2012 B 03277</li>
                <li><strong>Date d&apos;immatriculation :</strong> 31 juillet 2012</li>
                <li><strong>SIRET :</strong> 752 912 022 00015</li>
                <li><strong>Code APE :</strong> 6202A — Conseils en systèmes et logiciels informatiques</li>
                <li><strong>N° TVA intracommunautaire :</strong> FR92 752 912 022</li>
                <li><strong>Email :</strong> contact@cipia.fr</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Directeur de la publication
              </h2>
              <p>
                Stéphane Jambu, en qualité de gérant de Haruna SARL.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Hébergement
              </h2>
              <ul className="space-y-1">
                <li>
                  <strong>Serveur applicatif (frontend + backend + base de données) :</strong>{" "}
                  Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Allemagne —{" "}
                  <a href="https://www.hetzner.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.hetzner.com</a>
                </li>
                <li>
                  <strong>Nom de domaine :</strong> OVH SAS, 2 rue Kellermann, 59100 Roubaix, France
                </li>
                <li>
                  <strong>Emails transactionnels :</strong> Resend, Inc. (Delaware, USA) — conformément au transfert de données encadré par les Clauses Contractuelles Types (CCT) de la Commission européenne
                </li>
                <li>
                  <strong>Newsletters :</strong> Sendinblue SAS (marque Brevo), 7 rue de Madrid, 75008 Paris, France
                </li>
                <li>
                  <strong>Paiements :</strong> Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Propriété intellectuelle
              </h2>
              <p>
                L&apos;ensemble des contenus présents sur Cipia (textes, résumés générés par IA, interfaces,
                graphismes, logo, icônes, code source) sont la propriété exclusive de Haruna SARL, à l&apos;exception
                des contenus provenant de sources officielles (BOAMP, Légifrance, OPCO, Régions) qui restent soumis
                à leurs licences respectives (Licence Ouverte Etalab v2.0 pour les données publiques françaises).
              </p>
              <p className="mt-2">
                Toute reproduction, distribution, modification, adaptation, retransmission ou publication,
                même partielle, de ces éléments est soumise à l&apos;accord écrit préalable de Haruna SARL.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Données personnelles
              </h2>
              <p>
                Le traitement des données personnelles est détaillé dans notre{" "}
                <Link href="/confidentialite" className="text-primary hover:underline">
                  Politique de confidentialité
                </Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Conditions d&apos;utilisation et de vente
              </h2>
              <p>
                L&apos;accès et l&apos;utilisation du service sont régis par nos{" "}
                <Link href="/cgu" className="text-primary hover:underline">Conditions Générales d&apos;Utilisation</Link>.
                Les abonnements payants sont régis par nos{" "}
                <Link href="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Cookies
              </h2>
              <p>
                Cipia utilise uniquement des cookies strictement nécessaires au fonctionnement du service
                (session d&apos;authentification, sécurité CSRF). Aucun cookie publicitaire ni de tracking tiers
                n&apos;est déposé sans votre consentement.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Contact
              </h2>
              <ul className="mt-2 space-y-1">
                <li><strong>Email :</strong> contact@cipia.fr</li>
              </ul>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Dernière mise à jour : 25 avril 2026
            </p>
          </div>
        </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
