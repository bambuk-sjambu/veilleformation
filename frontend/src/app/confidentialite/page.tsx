import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité | Cipia",
  description: "Politique de confidentialité et protection des données personnelles de Cipia, édité par Haruna SARL.",
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
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
                Haruna SARL, éditeur du service Cipia, s&apos;engage à protéger la vie privée
                des utilisateurs du service. Cette politique explique quelles données sont collectées,
                à quelles fins, et quels sont vos droits conformément au Règlement Général sur la
                Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Responsable du traitement
              </h2>
              <p>
                Le responsable du traitement est Haruna SARL, représentée par son gérant Stéphane Jambu,
                dont le siège social est situé en France (coordonnées complètes dans les{" "}
                <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link>).
                Pour toute question relative à vos données personnelles :{" "}
                <a href="mailto:contact@cipia.fr" className="text-primary hover:underline">contact@cipia.fr</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Données collectées
              </h2>
              <p className="mb-2">Les données traitées sont les suivantes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Inscription compte :</strong> email, prénom, nom, mot de passe (stocké chiffré via bcrypt)</li>
                <li><strong>Profil organisme :</strong> nom de l&apos;entreprise, SIRET, NDE, adresse, responsable veille (facultatif, utilisé pour les exports PDF audit Qualiopi)</li>
                <li><strong>Préférences :</strong> régions et indicateurs Qualiopi suivis</li>
                <li><strong>Statut de lecture des articles :</strong> articles marqués comme lus, intéressants ou à exploiter</li>
                <li><strong>Données transactionnelles :</strong> plan souscrit, historique de facturation (gérés via Stripe)</li>
                <li><strong>Données techniques :</strong> logs d&apos;accès, adresse IP (conservation limitée à 6 mois)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Finalités du traitement
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Fourniture du service de veille réglementaire (collecte et classification IA d&apos;articles)</li>
                <li>Envoi de la newsletter hebdomadaire</li>
                <li>Génération du rapport d&apos;audit Qualiopi en PDF</li>
                <li>Gestion des abonnements payants et facturation</li>
                <li>Support client et réponse aux demandes</li>
                <li>Sécurité du service (détection de fraude, lutte contre les abus)</li>
                <li>Amélioration du service via statistiques agrégées et anonymisées</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Base légale
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Consentement :</strong> inscription à la newsletter gratuite</li>
                <li><strong>Exécution du contrat :</strong> fourniture des services payants (Solo, Équipe, Agence)</li>
                <li><strong>Obligation légale :</strong> conservation des factures (10 ans, article L.123-22 du Code de commerce)</li>
                <li><strong>Intérêt légitime :</strong> amélioration du service, sécurité</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Destinataires et sous-traitants
              </h2>
              <p className="mb-2">Vos données peuvent être transmises aux sous-traitants suivants, liés à Haruna SARL par un accord de traitement des données (DPA) :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Hetzner Online GmbH</strong> (Allemagne) — hébergement du service</li>
                <li><strong>Stripe Payments Europe Ltd.</strong> (Irlande) — traitement des paiements</li>
                <li><strong>Sendinblue SAS / Brevo</strong> (France) — envoi de la newsletter hebdomadaire</li>
                <li><strong>Resend, Inc.</strong> (USA, encadré par les Clauses Contractuelles Types) — emails transactionnels (confirmation d&apos;inscription, invitations d&apos;équipe)</li>
                <li><strong>Anthropic PBC</strong> (USA, encadré par les CCT) — classification IA des articles (les contenus traités sont des articles publics BOAMP/Légifrance, pas de données personnelles)</li>
              </ul>
              <p className="mt-2">
                Haruna SARL ne vend ni ne loue vos données personnelles à des tiers.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Durée de conservation
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Compte utilisateur :</strong> durée d&apos;utilisation du service + 3 ans après dernière connexion</li>
                <li><strong>Factures et données de paiement :</strong> 10 ans (obligation comptable)</li>
                <li><strong>Logs techniques :</strong> 6 mois</li>
                <li><strong>Liste newsletter :</strong> jusqu&apos;à désinscription + 3 ans de preuve de consentement</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Vos droits
              </h2>
              <p className="mb-2">Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Droit d&apos;accès à vos données</li>
                <li>Droit de rectification</li>
                <li>Droit à l&apos;effacement (droit à l&apos;oubli)</li>
                <li>Droit à la limitation du traitement</li>
                <li>Droit à la portabilité des données</li>
                <li>Droit d&apos;opposition</li>
                <li>Droit de définir des directives post-mortem</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, écrivez à{" "}
                <a href="mailto:contact@cipia.fr" className="text-primary hover:underline">contact@cipia.fr</a>{" "}
                avec une copie d&apos;une pièce d&apos;identité. Réponse sous 30 jours.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Sécurité
              </h2>
              <p>
                Haruna SARL met en œuvre les mesures techniques et organisationnelles suivantes pour protéger
                vos données : chiffrement TLS 1.3 en transit, hashage bcrypt des mots de passe, isolation
                des sessions via iron-session, sauvegardes quotidiennes chiffrées, accès restreint au serveur
                applicatif, journalisation des accès administratifs.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Cookies
              </h2>
              <p>
                Cipia utilise uniquement des cookies strictement nécessaires au fonctionnement du service
                (cookie de session d&apos;authentification, cookie CSRF). Ces cookies ne nécessitent pas de
                consentement au titre de l&apos;article 82 de la loi Informatique et Libertés. Aucun cookie
                publicitaire ni de tracking tiers n&apos;est déposé.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                11. Réclamation auprès de la CNIL
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
              Dernière mise à jour : 24 avril 2026
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-primary hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
