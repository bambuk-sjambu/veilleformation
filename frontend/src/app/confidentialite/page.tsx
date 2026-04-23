import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité | Cipia",
  description: "Politique de confidentialité et protection des données de Cipia",
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
                SJA Digital, éditeur du service Cipia, s&apos;engage à protéger la vie privée
                des utilisateurs de son service. Cette politique de confidentialité explique comment nous
                collectons, utilisons et protégeons vos données personnelles.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Responsable du traitement
              </h2>
              <p>
                Le responsable du traitement des données personnelles est SJA Digital, représenté par
                Stéphane Jambu. Pour toute question relative à vos données personnelles, vous pouvez
                nous contacter à : contact@cipia.fr
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Données collectées
              </h2>
              <p className="mb-2">Nous collectons les données suivantes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données d&apos;inscription :</strong> email, prénom, nom (facultatif)</li>
                <li><strong>Données de navigation :</strong> pages visitées, durée de visite (via Plausible)</li>
                <li><strong>Données transactionnelles :</strong> historique des newsletters reçues</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Finalités du traitement
              </h2>
              <p className="mb-2">Vos données sont utilisées pour :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Vous envoyer la newsletter hebdomadaire</li>
                <li>Améliorer notre service grâce aux statistiques anonymisées</li>
                <li>Répondre à vos demandes de contact</li>
                <li>Gérer votre abonnement (paid plans)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Base légale
              </h2>
              <p className="mb-2">Le traitement de vos données repose sur :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Votre consentement (inscription newsletter)</li>
                <li>L&apos;exécution du contrat (services payants)</li>
                <li>Notre intérêt légitime (amélioration du service)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Destinataires des données
              </h2>
              <p className="mb-2">Vos données peuvent être partagées avec :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Brevo (Sendinblue) :</strong> pour l&apos;envoi des newsletters (hébergement UE)</li>
                <li><strong>Stripe :</strong> pour les paiements (hébergement UE/USA)</li>
                <li><strong>Vercel :</strong> pour l&apos;hébergement du frontend</li>
              </ul>
              <p className="mt-2">
                Nous ne vendons jamais vos données à des tiers.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Durée de conservation
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Données d&apos;inscription :</strong> jusqu&apos;à votre désinscription + 3 ans</li>
                <li><strong>Historique newsletters :</strong> 6 mois</li>
                <li><strong>Logs techniques :</strong> 6 mois</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Vos droits
              </h2>
              <p className="mb-2">Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Droit d&apos;accès à vos données</li>
                <li>Droit de rectification</li>
                <li>Droit à l&apos;effacement (droit à l&apos;oubli)</li>
                <li>Droit à la limitation du traitement</li>
                <li>Droit à la portabilité</li>
                <li>Droit d&apos;opposition</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, contactez-nous à : contact@cipia.fr
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Sécurité
              </h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
                pour protéger vos données : chiffrement HTTPS, accès restreint, sauvegardes régulières.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Cookies
              </h2>
              <p>
                Ce site utilise Plausible Analytics, une solution de statistiques respectueuse de la vie privée,
                conforme au RGPD et qui n&apos;utilise pas de cookies. Aucun cookie publicitaire n&apos;est déposé.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                11. Réclamation
              </h2>
              <p>
                Si vous estimez que le traitement de vos données n&apos;est pas conforme à la réglementation,
                vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique
                et des Libertés) : www.cnil.fr
              </p>
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
