import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { sector } from "@/config";

export const metadata = {
  title: `Politique de confidentialité | ${sector.brand.name}`,
  description: `Politique de confidentialité et protection des données personnelles de ${sector.brand.name}, édité par Hi-Commerce SAS.`,
};

export default function ConfidentialitePage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Politique de confidentialité
          </h1>

          <section className="space-y-6 text-gray-600">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Introduction
              </h2>
              <p>
                Hi-Commerce SAS, éditeur du service {sector.brand.name}, s&apos;engage à protéger la vie privée
                des utilisateurs du Service. Cette politique explique quelles données sont collectées,
                à quelles fins, sur quelle base légale, et quels sont vos droits conformément au Règlement
                général sur la protection des données (RGPD, règlement (UE) 2016/679) et à la loi n°&nbsp;78-17
                du 6 janvier 1978 modifiée (« Informatique et Libertés »).
              </p>
              <p className="mt-2">
                Cette politique est complétée, sur les aspects techniques et opérationnels, par notre{" "}
                <Link href="/politique-donnees" className="text-primary hover:underline">politique de gestion des données</Link>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Responsable du traitement
              </h2>
              <p>
                Le responsable du traitement est <strong>Hi-Commerce SAS</strong>, représentée par son président
                Stéphane Jambu, qui assure également la fonction de référent RGPD interne (coordonnées complètes
                dans les{" "}
                <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link>).
                Pour toute question relative à vos données personnelles :{" "}
                <a href={`mailto:contact@${sector.brand.domain}`} className="text-primary hover:underline">{`contact@${sector.brand.domain}`}</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Personnes concernées
              </h2>
              <p>
                {sector.brand.name} s&apos;adresse à cinq grandes catégories de professionnels :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>les organismes de formation certifiés <strong>Qualiopi</strong> (référents veille, dirigeants, équipes pédagogiques)</li>
                <li>les restaurateurs et acteurs agroalimentaires soumis aux principes <strong>HACCP</strong></li>
                <li>les professionnels de santé en exercice <strong>libéral</strong> (médecins, kinésithérapeutes, infirmiers, etc.)</li>
                <li>les <strong>avocats indépendants</strong> et collaborateurs de cabinets</li>
                <li>les <strong>experts-comptables indépendants</strong> et collaborateurs de cabinets</li>
              </ul>
              <p className="mt-2">
                Les données collectées sont strictement professionnelles. Aucune donnée sensible au sens de
                l&apos;article 9 du RGPD (santé, opinions, données biométriques) n&apos;est collectée.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Données collectées
              </h2>
              <p className="mb-2">Les données traitées sont les suivantes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Inscription compte :</strong> email professionnel, prénom, nom, mot de passe (stocké chiffré via bcrypt avec coût ≥&nbsp;12)</li>
                <li><strong>Profil professionnel :</strong> secteur(s) sélectionné(s) parmi les 5 disponibles, nom du cabinet ou de la structure, ville/région, fonction&nbsp;; pour les organismes de formation, optionnellement SIRET et NDE pour la génération du rapport d&apos;audit Qualiopi</li>
                <li><strong>Préférences de veille :</strong> mots-clés d&apos;alerte, indicateurs/référentiels suivis (Qualiopi 23-26, HACCP, recommandations HAS, jurisprudences, BOFiP), régions ciblées</li>
                <li><strong>Activité applicative :</strong> articles marqués comme lus, intéressants, à exploiter&nbsp;; statut des actions internes</li>
                <li><strong>Données de paiement :</strong> jeton sécurisé Stripe (token), historique de facturation. <strong>Aucune donnée de carte bancaire n&apos;est stockée par Hi-Commerce SAS&nbsp;;</strong> les données de carte sont collectées et conservées exclusivement par Stripe (PCI-DSS niveau 1)</li>
                <li><strong>Membres d&apos;équipe (plan Cabinet) :</strong> emails et noms des collaborateurs invités, rôles (owner, admin, member)</li>
                <li><strong>Données techniques :</strong> logs d&apos;accès, adresse IP, agent utilisateur (conservation limitée à 6 mois pour la sécurité)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Finalités du traitement
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Fourniture du Service de veille réglementaire (collecte, classification IA et restitution d&apos;articles selon le secteur de l&apos;abonné)</li>
                <li>Envoi de la newsletter hebdomadaire</li>
                <li>Génération de rapports de veille au format PDF (audit Qualiopi, traçabilité interne, conformité)</li>
                <li>Gestion des abonnements payants, des essais gratuits de 14 jours et de la facturation</li>
                <li>Support client et réponse aux demandes</li>
                <li>Sécurité du Service (détection de fraude, lutte contre les abus, protection contre le scraping)</li>
                <li>Amélioration du Service via statistiques agrégées et anonymisées</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Bases légales (article 6 RGPD)
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Consentement (art. 6.1.a) :</strong> inscription à la newsletter gratuite (Cipia Newsletter) et envoi de communications marketing facultatives</li>
                <li><strong>Exécution du contrat (art. 6.1.b) :</strong> fourniture des Services payants Cipia Solo et Cipia Cabinet, gestion des accès, facturation</li>
                <li><strong>Obligation légale (art. 6.1.c) :</strong> conservation des factures (10 ans, article L.123-22 du Code de commerce), réponse aux réquisitions judiciaires</li>
                <li><strong>Intérêt légitime (art. 6.1.f) :</strong> sécurité du Service, prévention de la fraude, amélioration et statistiques agrégées, journalisation des accès</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Destinataires et sous-traitants
              </h2>
              <p className="mb-2">Vos données peuvent être transmises aux sous-traitants suivants, liés à Hi-Commerce SAS par un accord de traitement des données (DPA) conforme à l&apos;article 28 du RGPD :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Hetzner Online GmbH</strong> (Allemagne, datacenter UE) — hébergement applicatif et base de données</li>
                <li><strong>Stripe Payments Europe Ltd.</strong> (Irlande) — traitement des paiements et tokenisation des cartes bancaires</li>
                <li><strong>Sendinblue SAS / Brevo</strong> (France) — envoi de la newsletter hebdomadaire</li>
                <li><strong>Resend, Inc.</strong> (USA, encadré par les Clauses Contractuelles Types) — emails transactionnels (confirmation d&apos;inscription, invitations d&apos;équipe, factures)</li>
                <li><strong>Anthropic PBC</strong> (USA, encadré par les CCT) — classification par intelligence artificielle. Les contenus traités par l&apos;IA sont des <strong>textes officiels publics</strong> (Légifrance, BOAMP, BOFiP, etc.) ; aucune donnée personnelle utilisateur n&apos;est transmise à Anthropic dans le cadre du traitement IA</li>
                <li><strong>OVH SAS</strong> (France) — gestion du nom de domaine</li>
              </ul>
              <p className="mt-2">
                Hi-Commerce SAS <strong>ne vend ni ne loue vos données personnelles à des tiers</strong>.
                Aucune donnée n&apos;est utilisée à des fins publicitaires, de profilage commercial externe ou
                de revente.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Durées de conservation
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Compte utilisateur :</strong> durée d&apos;utilisation du Service + 3 ans après dernière connexion</li>
                <li><strong>Factures et données de paiement :</strong> 10 ans (obligation comptable, article L.123-22 du Code de commerce)</li>
                <li><strong>Logs techniques et adresses IP :</strong> 6 mois</li>
                <li><strong>Liste newsletter :</strong> jusqu&apos;à désinscription, puis 3 ans pour la preuve du consentement</li>
                <li><strong>Demandes de support :</strong> 2 ans après clôture</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Vos droits
              </h2>
              <p className="mb-2">Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Droit d&apos;accès à vos données (art. 15)</li>
                <li>Droit de rectification (art. 16)</li>
                <li>Droit à l&apos;effacement, dit « droit à l&apos;oubli » (art. 17)</li>
                <li>Droit à la limitation du traitement (art. 18)</li>
                <li>Droit à la portabilité des données (art. 20)</li>
                <li>Droit d&apos;opposition (art. 21)</li>
                <li>Droit de définir des directives post-mortem (art. 85 loi Informatique et Libertés)</li>
                <li>Droit de retirer son consentement à tout moment, sans effet rétroactif</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, écrivez à{" "}
                <a href={`mailto:contact@${sector.brand.domain}`} className="text-primary hover:underline">{`contact@${sector.brand.domain}`}</a>{" "}
                avec une copie d&apos;une pièce d&apos;identité. Hi-Commerce SAS répond dans un délai maximum
                d&apos;un mois (prolongeable de deux mois pour les demandes complexes, art. 12 RGPD).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Sécurité
              </h2>
              <p>
                Hi-Commerce SAS met en œuvre les mesures techniques et organisationnelles suivantes pour protéger
                vos données : chiffrement TLS 1.3 en transit, hashage bcrypt des mots de passe (coût ≥&nbsp;12),
                isolation des sessions via iron-session, sauvegardes quotidiennes chiffrées, accès restreint
                au serveur applicatif via clé SSH, journalisation des accès administratifs.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                11. Cookies
              </h2>
              <p>
                {sector.brand.name} utilise uniquement des cookies strictement nécessaires au fonctionnement du Service
                (cookie de session d&apos;authentification, cookie CSRF, jeton Stripe lors d&apos;une transaction).
                Ces cookies ne nécessitent pas de consentement au titre de l&apos;article 82 de la loi Informatique
                et Libertés. <strong>Aucun cookie publicitaire, aucun cookie de mesure d&apos;audience tierce et
                aucun traceur tiers</strong> n&apos;est déposé.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                12. Réclamation auprès de la CNIL
              </h2>
              <p>
                Si vous estimez que le traitement de vos données n&apos;est pas conforme à la réglementation,
                vous pouvez introduire une réclamation auprès de la Commission Nationale de l&apos;Informatique
                et des Libertés (CNIL) : 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{" "}
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>.
              </p>
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
