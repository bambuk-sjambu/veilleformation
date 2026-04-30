import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { sector } from "@/config";

export const metadata = {
  title: `Conditions Générales d'Utilisation | ${sector.brand.name}`,
  description: `Conditions Générales d'Utilisation du service ${sector.brand.name} édité par Haruna SARL.`,
};

export default function CguPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-sm text-gray-500 mb-8">Version en vigueur au 24 avril 2026</p>

          <section className="space-y-6 text-gray-600">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Objet
              </h2>
              <p>
                Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet
                de définir les modalités d&apos;accès et d&apos;utilisation du service {sector.brand.name} (ci-après le « Service »),
                édité par <strong>Haruna SARL</strong>, société à responsabilité limitée de droit français
                dont le siège est situé en France (coordonnées détaillées dans les{" "}
                <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link>).
              </p>
              <p className="mt-2">
                {sector.brand.name} est une plateforme de veille réglementaire automatisée par intelligence artificielle,
                destinée aux {sector.vocab.audience} certifiés {sector.vocab.regulatorName} et à leurs partenaires.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Acceptation des CGU
              </h2>
              <p>
                L&apos;accès et l&apos;utilisation du Service impliquent l&apos;acceptation pleine et entière
                des présentes CGU. En créant un compte, l&apos;utilisateur reconnaît avoir pris connaissance
                des CGU et les accepter sans réserve.
              </p>
              <p className="mt-2">
                Haruna SARL se réserve la faculté de modifier les CGU à tout moment. Les utilisateurs seront
                informés par email au moins 30 jours avant l&apos;entrée en vigueur de toute modification substantielle.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Description du Service
              </h2>
              <p>{sector.brand.name} propose les fonctionnalités suivantes :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Collecte automatisée d&apos;articles réglementaires issus de sources publiques officielles (BOAMP, Légifrance, OPCO, France Travail, Conseils Régionaux)</li>
                <li>Résumé et classification par intelligence artificielle selon les indicateurs Qualiopi 23 à 26</li>
                <li>Tableau de bord de veille personnalisable par région et thématique</li>
                <li>Newsletter hebdomadaire</li>
                <li>Export d&apos;un rapport d&apos;{sector.vocab.auditName} au format PDF (plans payants)</li>
                <li>Gestion collaborative en équipe (plans Équipe et Agence)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Création de compte
              </h2>
              <p>
                L&apos;accès aux fonctionnalités du Service requiert la création d&apos;un compte personnel.
                L&apos;utilisateur s&apos;engage à fournir des informations exactes, à jour et complètes,
                et à préserver la confidentialité de son mot de passe. Chaque compte est strictement personnel ;
                le partage d&apos;identifiants entre plusieurs personnes est réservé aux plans prévoyant
                un nombre d&apos;utilisateurs supérieur à un (Équipe, Agence).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Usage autorisé
              </h2>
              <p>L&apos;utilisateur s&apos;engage à utiliser le Service dans un cadre professionnel et conforme :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>à la législation française et européenne en vigueur</li>
                <li>aux présentes CGU et à la politique d&apos;usage acceptable</li>
                <li>aux droits des tiers (propriété intellectuelle, données personnelles)</li>
              </ul>
              <p className="mt-2">Sont notamment réservés à la sphère interne de l&apos;organisme abonné :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>la consultation du contenu agrégé</li>
                <li>la redistribution interne d&apos;extraits (newsletter interne, intranet)</li>
                <li>l&apos;export de rapports d&apos;audit pour les besoins de la certification {sector.vocab.regulatorName} de l&apos;organisme abonné</li>
              </ul>
              <p className="mt-2">
                La revente, la mise à disposition à des tiers non abonnés, le scraping automatisé du Service
                ou l&apos;utilisation dans un produit concurrent sont soumis à autorisation écrite préalable
                de Haruna SARL.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Propriété intellectuelle
              </h2>
              <p>
                Le Service, sa structure, son interface, ses algorithmes de classification IA, ainsi que les
                résumés et scores de pertinence générés sont la propriété exclusive de Haruna SARL.
              </p>
              <p className="mt-2">
                Les contenus issus de sources publiques (BOAMP, Légifrance, données administratives) restent
                soumis à leurs licences d&apos;origine (Licence Ouverte Etalab v2.0 notamment). {sector.brand.name} agit en
                tant qu&apos;agrégateur et enrichisseur de ces données.
              </p>
              <p className="mt-2">
                L&apos;abonnement confère à l&apos;utilisateur un droit d&apos;usage personnel, non exclusif,
                non transférable et limité à la durée de l&apos;abonnement.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Disponibilité du Service
              </h2>
              <p>
                Haruna SARL s&apos;engage, dans le cadre d&apos;une obligation de moyens, à maintenir le Service
                accessible 24 heures sur 24 et 7 jours sur 7. Des interruptions peuvent intervenir pour des
                opérations de maintenance, qui seront dans la mesure du possible planifiées hors heures ouvrées
                et annoncées à l&apos;avance.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Nature du Service et responsabilité {sector.vocab.regulatorName}
              </h2>
              <p>
                {sector.brand.name} est un <strong>outil d&apos;aide à la veille réglementaire</strong>. Il facilite la collecte,
                la classification et la traçabilité des sources nécessaires aux indicateurs Qualiopi 23 à 26.
              </p>
              <p className="mt-2">
                La <strong>conformité à la certification {sector.vocab.regulatorName}</strong> demeure la responsabilité exclusive
                de l&apos;organisme de formation. L&apos;utilisateur reste seul responsable :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>de l&apos;analyse éditoriale finale des articles proposés</li>
                <li>de la mise en œuvre opérationnelle des changements réglementaires détectés</li>
                <li>de la production des preuves lors des audits {sector.vocab.regulatorName}</li>
                <li>du respect de ses obligations réglementaires propres</li>
              </ul>
              <p className="mt-2">
                Les résumés et classifications produits par intelligence artificielle constituent une aide
                à la décision et ne sauraient se substituer à une analyse humaine pour les décisions à fort enjeu.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Données personnelles
              </h2>
              <p>
                Le traitement des données personnelles est encadré par la{" "}
                <Link href="/confidentialite" className="text-primary hover:underline">politique de confidentialité</Link>{" "}
                et la{" "}
                <Link href="/politique-donnees" className="text-primary hover:underline">politique de gestion des données</Link>,
                conformes au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés modifiée.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Responsabilité
              </h2>
              <p>
                La responsabilité de Haruna SARL est engagée dans les limites prévues par la loi française.
                Elle ne saurait être tenue responsable :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>des dommages indirects ou immatériels (perte de chiffre d&apos;affaires, perte de chance, atteinte à l&apos;image)</li>
                <li>des interruptions résultant d&apos;un cas de force majeure au sens de l&apos;article 1218 du Code civil</li>
                <li>d&apos;un usage non conforme du Service par l&apos;utilisateur</li>
                <li>d&apos;erreurs, d&apos;omissions ou de retards affectant les sources publiques d&apos;origine</li>
              </ul>
              <p className="mt-2">
                Pour les abonnements payants, toute réclamation indemnitaire est plafonnée au montant
                effectivement payé par l&apos;utilisateur au titre des 12 mois précédant le fait générateur.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                11. Suspension et résiliation
              </h2>
              <p>
                Haruna SARL peut suspendre ou résilier un compte en cas de manquement grave aux présentes CGU,
                notamment : usage frauduleux, scraping massif, tentative de contournement des limitations de plan,
                contenus illicites. La résiliation intervient après mise en demeure restée sans effet pendant 8 jours,
                sauf urgence en matière de sécurité.
              </p>
              <p className="mt-2">
                L&apos;utilisateur peut à tout moment résilier son compte gratuit depuis la page Paramètres,
                ou son abonnement payant selon les modalités prévues aux{" "}
                <Link href="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                12. Droit applicable et juridiction
              </h2>
              <p>
                Les présentes CGU sont régies par le droit français. Tout litige relatif à leur exécution
                ou à leur interprétation sera soumis, à défaut de résolution amiable, aux tribunaux compétents
                du ressort du siège social de Haruna SARL.
              </p>
              <p className="mt-2">
                Conformément à l&apos;article L.616-1 du Code de la consommation, l&apos;utilisateur consommateur
                peut recourir gratuitement à un médiateur de la consommation en cas de litige (coordonnées
                disponibles sur demande à <a href={`mailto:contact@${sector.brand.domain}`} className="text-primary hover:underline">{`contact@${sector.brand.domain}`}</a>).
                La plateforme européenne de règlement en ligne des litiges est accessible à{" "}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                13. Contact
              </h2>
              <ul className="mt-2 space-y-1">
                <li><strong>Email :</strong> {`contact@${sector.brand.domain}`}</li>
                <li><strong>Support :</strong> {`support@${sector.brand.domain}`}</li>
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
