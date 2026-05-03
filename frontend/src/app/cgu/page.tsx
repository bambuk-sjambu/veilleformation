import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { sector } from "@/config";

export const metadata = {
  title: `Conditions Générales d'Utilisation | ${sector.brand.name}`,
  description: `Conditions Générales d'Utilisation du service ${sector.brand.name} édité par Hi-Commerce SAS.`,
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
          <p className="text-sm text-gray-500 mb-8">Version en vigueur au 4 mai 2026</p>

          <section className="space-y-6 text-gray-600">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Objet
              </h2>
              <p>
                Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet
                de définir les modalités d&apos;accès et d&apos;utilisation du service {sector.brand.name} (ci-après le « Service »),
                édité par <strong>Hi-Commerce SAS</strong>, société par actions simplifiée de droit français
                (coordonnées détaillées dans les{" "}
                <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link>).
              </p>
              <p className="mt-2">
                {sector.brand.name} est une plateforme de veille réglementaire automatisée par intelligence artificielle,
                destinée aux professionnels indépendants et aux cabinets exerçant dans cinq secteurs réglementés :
                organismes de formation certifiés Qualiopi, restaurateurs et acteurs agroalimentaires soumis aux
                principes HACCP, professionnels de santé en exercice libéral, avocats indépendants et experts-comptables
                indépendants.
              </p>
              <p className="mt-2">
                Le Service couvre cinq corpus de référence : les indicateurs Qualiopi 23 à 26, les principes HACCP
                (Hazard Analysis Critical Control Point), les recommandations de la Haute Autorité de Santé (HAS),
                la jurisprudence des juridictions suprêmes (Cour de cassation, Conseil d&apos;État) et le Bulletin
                officiel des finances publiques (BOFiP).
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
                Hi-Commerce SAS se réserve la faculté de modifier les CGU à tout moment. Les utilisateurs seront
                informés par email au moins 30 jours avant l&apos;entrée en vigueur de toute modification substantielle.
                Le Service est exclusivement destiné à un usage professionnel (B2B) ; le droit de rétractation prévu
                aux articles L.221-18 et suivants du Code de la consommation ne s&apos;applique donc pas.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Description du Service
              </h2>
              <p>{sector.brand.name} propose les fonctionnalités suivantes :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Collecte automatisée de textes officiels et d&apos;informations réglementaires issues de sources publiques (Légifrance, BOAMP, BOFiP, Journal officiel, sites de la HAS, de l&apos;ANSES, des ordres professionnels, OPCO, Conseils Régionaux, France Travail, etc.)</li>
                <li>Résumé et classification par intelligence artificielle (Anthropic Claude) selon la taxonomie du secteur sélectionné par l&apos;utilisateur</li>
                <li>Tableau de bord de veille personnalisable par secteur, mots-clés et région</li>
                <li>Newsletter hebdomadaire (1 secteur en plan gratuit)</li>
                <li>Alertes personnalisées et marquage des contenus (plans payants)</li>
                <li>Export d&apos;un rapport de veille au format PDF, prêt pour l&apos;{sector.vocab.auditName} ou pour la traçabilité interne (plans payants)</li>
                <li>Gestion collaborative en cabinet (plan Cabinet, jusqu&apos;à 10 utilisateurs)</li>
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
                le partage d&apos;identifiants entre plusieurs personnes est réservé au plan Cabinet, dans la limite
                de 10 utilisateurs nominatifs distincts par cabinet.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Plans et tarifs
              </h2>
              <p>Le Service est proposé selon les plans suivants :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Cipia Newsletter</strong> : <strong>0&nbsp;€/an</strong> — newsletter hebdomadaire sur 1 secteur, sans saisie de carte bancaire.</li>
                <li><strong>Cipia Solo</strong> : <strong>19&nbsp;€/an</strong> — accès complet au tableau de bord, alertes personnalisées, export PDF illimité, 1 utilisateur. <em>14 jours d&apos;essai gratuit</em>.</li>
                <li><strong>Cipia Cabinet</strong> : <strong>199&nbsp;€/an pour 10 utilisateurs</strong> — toutes les fonctionnalités Solo, plus la gestion collaborative, l&apos;export PDF avec logo du cabinet et le suivi multi-utilisateurs. <em>14 jours d&apos;essai gratuit</em>.</li>
              </ul>
              <p className="mt-2">
                Les plans payants sont sans engagement et résiliables en un clic depuis l&apos;espace personnel.
                Le paiement s&apos;effectue exclusivement via Stripe. Les modalités complètes de souscription,
                de facturation et de résiliation sont détaillées dans les{" "}
                <Link href="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Usage autorisé
              </h2>
              <p>L&apos;utilisateur s&apos;engage à utiliser le Service dans un cadre professionnel et conforme :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>à la législation française et européenne en vigueur</li>
                <li>aux présentes CGU et à la politique d&apos;usage acceptable</li>
                <li>aux droits des tiers (propriété intellectuelle, données personnelles)</li>
              </ul>
              <p className="mt-2">Sont notamment réservés à la sphère interne du professionnel ou du cabinet abonné :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>la consultation du contenu agrégé</li>
                <li>la redistribution interne d&apos;extraits (note interne, intranet, dossier client)</li>
                <li>l&apos;export de rapports de veille pour les besoins de l&apos;audit, de la traçabilité réglementaire ou de la conformité de l&apos;abonné</li>
              </ul>
              <p className="mt-2">
                La revente, la mise à disposition à des tiers non abonnés, le scraping automatisé du Service
                ou son utilisation dans un produit concurrent sont soumis à autorisation écrite préalable
                de Hi-Commerce SAS.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Propriété intellectuelle
              </h2>
              <p>
                Le Service, sa structure, son interface, ses algorithmes de classification IA, ainsi que les
                résumés et scores de pertinence générés sont la propriété exclusive de Hi-Commerce SAS.
              </p>
              <p className="mt-2">
                Les contenus issus de sources publiques (Légifrance, BOAMP, BOFiP, Journal officiel, données
                administratives) restent soumis à leurs licences d&apos;origine, notamment la Licence Ouverte
                Etalab v2.0. {sector.brand.name} agit en tant qu&apos;agrégateur et enrichisseur de ces données.
              </p>
              <p className="mt-2">
                L&apos;abonnement confère à l&apos;utilisateur un droit d&apos;usage personnel, non exclusif,
                non transférable et limité à la durée de l&apos;abonnement.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Disponibilité du Service
              </h2>
              <p>
                Hi-Commerce SAS s&apos;engage, dans le cadre d&apos;une obligation de moyens, à maintenir le Service
                accessible 24 heures sur 24 et 7 jours sur 7. Des interruptions peuvent intervenir pour des
                opérations de maintenance, qui seront dans la mesure du possible planifiées hors heures ouvrées
                et annoncées à l&apos;avance.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Nature du Service, rôle de l&apos;intelligence artificielle et responsabilité de l&apos;utilisateur
              </h2>
              <p>
                {sector.brand.name} est un <strong>outil d&apos;aide à la veille réglementaire</strong>. Il facilite la collecte,
                la classification et la traçabilité des sources nécessaires à l&apos;exercice professionnel de l&apos;abonné.
              </p>
              <p className="mt-2">
                Les résumés, classifications, scores d&apos;impact et alertes sont produits par un modèle d&apos;intelligence
                artificielle exploité par Anthropic PBC (Claude). Ils ont une valeur strictement <strong>informative</strong>
                et <strong>ne se substituent en aucun cas</strong> à un conseil juridique, médical, sanitaire, comptable
                ou fiscal délivré par un professionnel qualifié dans le cadre d&apos;une relation client individualisée.
              </p>
              <p className="mt-2">
                La <strong>conformité réglementaire</strong> et la responsabilité professionnelle demeurent exclusivement
                à la charge de l&apos;abonné. L&apos;utilisateur reste seul responsable :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>de l&apos;analyse éditoriale finale des articles, textes et contenus proposés</li>
                <li>de la mise en œuvre opérationnelle des changements réglementaires détectés</li>
                <li>de la production des preuves lors d&apos;audits, de contrôles ou d&apos;inspections (Qualiopi, services vétérinaires, ARS, ordres professionnels, administration fiscale, etc.)</li>
                <li>du respect de ses obligations réglementaires, déontologiques et professionnelles propres</li>
              </ul>
              <p className="mt-2">
                Les résumés et classifications produits par intelligence artificielle constituent une aide
                à la décision et ne sauraient se substituer à une analyse humaine pour les décisions à fort enjeu.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Données personnelles
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
                11. Responsabilité
              </h2>
              <p>
                La responsabilité de Hi-Commerce SAS est engagée dans les limites prévues par la loi française.
                Elle ne saurait être tenue responsable :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>des dommages indirects ou immatériels (perte de chiffre d&apos;affaires, perte de chance, atteinte à l&apos;image)</li>
                <li>des interruptions résultant d&apos;un cas de force majeure au sens de l&apos;article 1218 du Code civil</li>
                <li>d&apos;un usage non conforme du Service par l&apos;utilisateur</li>
                <li>d&apos;erreurs, d&apos;omissions, d&apos;imprécisions ou de retards affectant les sources publiques d&apos;origine</li>
                <li>des erreurs, hallucinations ou imprécisions inhérentes aux modèles d&apos;intelligence artificielle utilisés pour le résumé et la classification</li>
              </ul>
              <p className="mt-2">
                Pour les abonnements payants, toute réclamation indemnitaire est plafonnée au montant
                effectivement payé par l&apos;utilisateur au titre des 12 mois précédant le fait générateur.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                12. Suspension et résiliation
              </h2>
              <p>
                Hi-Commerce SAS peut suspendre ou résilier un compte en cas de manquement grave aux présentes CGU,
                notamment : usage frauduleux, scraping massif, tentative de contournement des limitations de plan,
                contenus illicites. La résiliation intervient après mise en demeure restée sans effet pendant 8 jours,
                sauf urgence en matière de sécurité.
              </p>
              <p className="mt-2">
                L&apos;utilisateur peut à tout moment résilier son compte gratuit depuis la page Paramètres,
                ou son abonnement payant en un clic depuis l&apos;espace personnel ou via le portail Stripe,
                selon les modalités prévues aux{" "}
                <Link href="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>.
                Aucun engagement de durée n&apos;est imposé.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                13. Droit applicable et juridiction
              </h2>
              <p>
                Les présentes CGU sont régies par le droit français. Le Service étant exclusivement destiné à
                un usage professionnel, tout litige relatif à leur exécution ou à leur interprétation sera soumis,
                à défaut de résolution amiable, aux tribunaux compétents du ressort du siège social de Hi-Commerce SAS,
                y compris en cas de pluralité de défendeurs ou d&apos;appel en garantie.
              </p>
              <p className="mt-2">
                Pour mémoire, la plateforme européenne de règlement en ligne des litiges (réservée aux contrats
                de consommation) est accessible à{" "}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                14. Contact
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
