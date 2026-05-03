import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { sector } from "@/config";

export const metadata = {
  title: `Mentions légales | ${sector.brand.name}`,
  description: `Mentions légales du service ${sector.brand.name} édité par Hi-Commerce SAS.`,
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
              <p>
                Le service {sector.brand.name} est édité par <strong>Hi-Commerce SAS</strong>, plateforme de veille
                réglementaire automatisée par intelligence artificielle, destinée aux 596&nbsp;000 professionnels
                indépendants et cabinets français exerçant dans cinq secteurs réglementés (organismes de formation
                Qualiopi, restaurateurs et acteurs HACCP, professionnels de santé libéraux, avocats indépendants,
                experts-comptables indépendants).
              </p>
              <ul className="mt-2 space-y-1">
                <li><strong>Raison sociale :</strong> Hi-Commerce SAS</li>
                <li><strong>Forme juridique :</strong> Société par actions simplifiée (SAS) de droit français</li>
                <li><strong>Siège social :</strong> [ADRESSE SIÈGE HI-COMMERCE SAS]</li>
                <li><strong>RCS :</strong> [RCS HI-COMMERCE SAS]</li>
                <li><strong>SIREN :</strong> [SIREN HI-COMMERCE SAS]</li>
                <li><strong>SIRET :</strong> [SIRET HI-COMMERCE SAS]</li>
                <li><strong>Code APE :</strong> [APE HI-COMMERCE SAS]</li>
                <li><strong>N° TVA intracommunautaire :</strong> [TVA INTRA HI-COMMERCE SAS]</li>
                <li><strong>Capital social :</strong> [CAPITAL HI-COMMERCE SAS]</li>
                <li><strong>Email :</strong> {`contact@${sector.brand.domain}`}</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Directeur de la publication
              </h2>
              <p>
                Stéphane Jambu, en qualité de président de Hi-Commerce SAS.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Marques et dénominations
              </h2>
              <p>
                « Cipia », « Cipia Newsletter », « Cipia Solo » et « Cipia Cabinet » sont des dénominations
                commerciales exploitées par Hi-Commerce SAS. Toute reproduction ou utilisation non autorisée
                est passible de sanctions au titre du livre VII du Code de la propriété intellectuelle.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Hébergement
              </h2>
              <ul className="space-y-1">
                <li>
                  <strong>Serveur applicatif (frontend, backend et base de données) :</strong>{" "}
                  Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Allemagne —{" "}
                  <a href="https://www.hetzner.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.hetzner.com</a>.
                  Les données utilisateurs et la base de données du Service sont localisées sur un serveur
                  physique situé en France (Falkenstein/Helsinki/France selon le datacenter choisi&nbsp;; le
                  datacenter retenu pour {sector.brand.name} est situé sur le territoire de l&apos;Union européenne).
                </li>
                <li>
                  <strong>Nom de domaine :</strong> OVH SAS, 2 rue Kellermann, 59100 Roubaix, France
                </li>
                <li>
                  <strong>Emails transactionnels :</strong> Resend, Inc. (Delaware, USA) — transferts encadrés par les Clauses Contractuelles Types (CCT) de la Commission européenne (décision 2021/914)
                </li>
                <li>
                  <strong>Newsletters :</strong> Sendinblue SAS (marque Brevo), 7 rue de Madrid, 75008 Paris, France
                </li>
                <li>
                  <strong>Paiements :</strong> Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irlande
                </li>
                <li>
                  <strong>Classification IA :</strong> Anthropic PBC, San Francisco (USA) — transferts encadrés par les CCT
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Propriété intellectuelle
              </h2>
              <p>
                L&apos;ensemble des contenus présents sur {sector.brand.name} (textes, résumés générés par IA, interfaces,
                graphismes, logo, icônes, code source) sont la propriété exclusive de Hi-Commerce SAS, à l&apos;exception
                des contenus provenant de sources officielles (Légifrance, BOAMP, BOFiP, Journal officiel, HAS, ANSES,
                ordres professionnels, OPCO, Régions) qui restent soumis à leurs licences respectives, notamment la
                Licence Ouverte Etalab v2.0 pour les données publiques françaises.
              </p>
              <p className="mt-2">
                Toute reproduction, distribution, modification, adaptation, retransmission ou publication,
                même partielle, de ces éléments est soumise à l&apos;accord écrit préalable de Hi-Commerce SAS.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Données personnelles
              </h2>
              <p>
                Le traitement des données personnelles est détaillé dans notre{" "}
                <Link href="/confidentialite" className="text-primary hover:underline">
                  Politique de confidentialité
                </Link>{" "}et dans notre{" "}
                <Link href="/politique-donnees" className="text-primary hover:underline">
                  Politique de gestion des données
                </Link>.
                Les demandes relatives au RGPD sont à adresser à{" "}
                <a href={`mailto:contact@${sector.brand.domain}`} className="text-primary hover:underline">{`contact@${sector.brand.domain}`}</a>.
                Hi-Commerce SAS, en tant que responsable de traitement, est représentée par Stéphane Jambu
                pour toutes les questions relatives à la protection des données personnelles.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Conditions d&apos;utilisation et de vente
              </h2>
              <p>
                L&apos;accès et l&apos;utilisation du Service sont régis par nos{" "}
                <Link href="/cgu" className="text-primary hover:underline">Conditions Générales d&apos;Utilisation</Link>.
                Les abonnements payants (Cipia Solo, Cipia Cabinet) sont régis par nos{" "}
                <Link href="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Cookies
              </h2>
              <p>
                {sector.brand.name} utilise uniquement des cookies strictement nécessaires au fonctionnement du Service
                (session d&apos;authentification, sécurité CSRF, jeton de paiement Stripe lors d&apos;une transaction).
                Aucun cookie publicitaire, aucun cookie de mesure d&apos;audience tierce et aucun traceur tiers
                ne sont déposés sans consentement préalable.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Médiation et règlement des litiges
              </h2>
              <p>
                Le Service est exclusivement destiné aux professionnels (B2B). En cas de litige, les parties
                s&apos;efforceront de trouver une solution amiable préalable. À défaut, les juridictions compétentes
                du ressort du siège social de Hi-Commerce SAS seront seules saisies, conformément aux{" "}
                <Link href="/cgu" className="text-primary hover:underline">CGU</Link> et aux{" "}
                <Link href="/cgv" className="text-primary hover:underline">CGV</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Contact
              </h2>
              <ul className="mt-2 space-y-1">
                <li><strong>Email :</strong> {`contact@${sector.brand.domain}`}</li>
                <li><strong>Support :</strong> {`support@${sector.brand.domain}`}</li>
              </ul>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Dernière mise à jour : 4 mai 2026
            </p>
          </div>
        </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
