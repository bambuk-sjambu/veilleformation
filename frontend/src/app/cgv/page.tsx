import Link from "next/link";

export const metadata = {
  title: "Conditions Générales de Vente | Cipia",
  description: "Conditions Générales de Vente des abonnements Cipia, édités par Haruna SARL.",
};

export default function CgvPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conditions Générales de Vente
          </h1>
          <p className="text-sm text-gray-500 mb-8">Version en vigueur au 24 avril 2026</p>

          <section className="space-y-6 text-gray-600">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Préambule
              </h2>
              <p>
                Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent la souscription,
                la facturation et la résiliation des abonnements payants au service Cipia (ci-après le « Service »),
                édité par <strong>Haruna SARL</strong>, société à responsabilité limitée de droit français
                (coordonnées complètes dans les{" "}
                <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link>).
              </p>
              <p className="mt-2">
                Elles complètent les{" "}
                <Link href="/cgu" className="text-primary hover:underline">Conditions Générales d&apos;Utilisation</Link>{" "}
                applicables à l&apos;ensemble du Service. En cas de contradiction, les présentes CGV prévalent sur
                les CGU pour les dispositions relatives à la vente.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Formules et prix
              </h2>
              <p>Haruna SARL propose quatre formules :</p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Formule</th>
                      <th className="text-left py-2">Prix mensuel HT</th>
                      <th className="text-left py-2">Utilisateurs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2"><strong>Gratuit</strong></td>
                      <td className="py-2">0 €</td>
                      <td className="py-2">1</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2"><strong>Solo</strong></td>
                      <td className="py-2">15 €</td>
                      <td className="py-2">1</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2"><strong>Équipe</strong></td>
                      <td className="py-2">39 €</td>
                      <td className="py-2">jusqu&apos;à 5</td>
                    </tr>
                    <tr>
                      <td className="py-2"><strong>Agence</strong></td>
                      <td className="py-2">79 €</td>
                      <td className="py-2">jusqu&apos;à 20</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                Les prix sont exprimés en euros hors taxes. La TVA française applicable (20 %) ou tout autre taux
                légal en vigueur est appliquée en sus. Les clients professionnels établis dans l&apos;Union européenne
                hors France et disposant d&apos;un numéro de TVA intracommunautaire valide bénéficient de
                l&apos;autoliquidation de la TVA (article 196 de la directive 2006/112/CE).
              </p>
              <p className="mt-2">
                Le détail à jour des formules est disponible sur{" "}
                <Link href="/pricing" className="text-primary hover:underline">la page tarifs</Link>.
                Haruna SARL se réserve le droit de modifier ses tarifs à tout moment ; les prix en vigueur à la date
                de souscription s&apos;appliquent pour toute la durée de l&apos;engagement en cours.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Commande et formation du contrat
              </h2>
              <p>
                La souscription s&apos;effectue en ligne depuis la page <Link href="/pricing" className="text-primary hover:underline">tarifs</Link>.
                Le contrat est formé à la confirmation du paiement par le prestataire Stripe Payments Europe Ltd.
                Un email de confirmation comportant la facture est ensuite adressé au client.
              </p>
              <p className="mt-2">
                Le client reconnaît avoir pris connaissance des présentes CGV avant toute souscription et les accepter
                sans réserve en cochant la case prévue à cet effet lors de la commande.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Paiement
              </h2>
              <p>
                Le règlement s&apos;effectue par carte bancaire via Stripe (certification PCI DSS Niveau 1).
                Haruna SARL n&apos;a jamais accès aux données bancaires du client.
              </p>
              <p className="mt-2">
                L&apos;abonnement est facturé d&apos;avance, mensuellement ou annuellement selon le choix du client
                à la souscription. Le prélèvement est reconduit automatiquement à chaque échéance jusqu&apos;à résiliation.
              </p>
              <p className="mt-2">
                En cas d&apos;échec de paiement, Haruna SARL adresse un rappel par email au client. Après 14 jours
                d&apos;impayé sans régularisation, l&apos;accès aux fonctionnalités payantes est suspendu ; le compte
                est rétrogradé en formule Gratuit sans préjudice du recouvrement des sommes dues.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Durée et renouvellement
              </h2>
              <p>
                Les abonnements sont souscrits pour une durée d&apos;un mois ou d&apos;un an selon l&apos;option
                retenue. Ils se renouvellent tacitement pour une période équivalente, sauf résiliation
                effectuée avant l&apos;échéance.
              </p>
              <p className="mt-2">
                Conformément à l&apos;article L.215-1 du Code de la consommation, les clients consommateurs
                sont informés par écrit, au plus tôt trois mois et au plus tard un mois avant le terme de
                la période autorisant le rejet de la reconduction, de la possibilité de ne pas reconduire
                le contrat.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Droit de rétractation (clients consommateurs)
              </h2>
              <p>
                Conformément aux articles L.221-18 et suivants du Code de la consommation, le client consommateur
                dispose d&apos;un délai de <strong>14 jours calendaires</strong> à compter de la conclusion
                du contrat pour exercer son droit de rétractation, sans avoir à motiver sa décision.
              </p>
              <p className="mt-2">
                <strong>Demande expresse d&apos;exécution immédiate :</strong> en souscrivant et en accédant immédiatement
                au Service, le client demande expressément que l&apos;exécution commence avant la fin du délai de
                rétractation. Conformément à l&apos;article L.221-25 du Code de la consommation, il renonce
                expressément à son droit de rétractation une fois le Service pleinement exécuté (accès et usage effectif).
              </p>
              <p className="mt-2">
                Pour exercer son droit de rétractation dans le délai, le client peut adresser sa demande par email à{" "}
                <a href="mailto:contact@cipia.fr" className="text-primary hover:underline">contact@cipia.fr</a>.
                Dans le cas d&apos;un usage déjà commencé, le montant remboursé sera proportionnel à la période
                non consommée.
              </p>
              <p className="mt-2 text-sm italic">
                Le droit de rétractation ne s&apos;applique pas aux contrats conclus entre professionnels
                (article L.221-3 du Code de la consommation), sauf stipulation contraire. Haruna SARL applique
                néanmoins par geste commercial un délai de 14 jours de remboursement intégral aux professionnels
                sur le premier mois d&apos;abonnement, sur demande écrite.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Résiliation
              </h2>
              <p>
                Le client peut résilier son abonnement à tout moment depuis son espace personnel (Dashboard &gt;
                Abonnement &gt; Gérer via Stripe) ou par email à{" "}
                <a href="mailto:contact@cipia.fr" className="text-primary hover:underline">contact@cipia.fr</a>.
              </p>
              <p className="mt-2">
                La résiliation prend effet à la fin de la période de facturation en cours : le client conserve
                l&apos;accès au Service jusqu&apos;à cette date. Aucun remboursement au prorata n&apos;est effectué
                pour la période déjà entamée, sauf application du droit de rétractation ci-dessus.
              </p>
              <p className="mt-2">
                Haruna SARL peut résilier l&apos;abonnement en cas de manquement grave aux CGU ou aux présentes CGV,
                dans les conditions prévues à l&apos;article 11 des CGU.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Changement de formule
              </h2>
              <p>
                Le client peut faire évoluer sa formule à tout moment depuis son espace personnel. En cas de montée
                de gamme, la différence de prix est calculée au prorata pour la période restante et facturée immédiatement.
                En cas de passage à une formule inférieure, le changement prend effet au terme de la période de
                facturation en cours.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Obligations de Haruna SARL
              </h2>
              <p>Haruna SARL s&apos;engage, dans le cadre d&apos;une obligation de moyens, à :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>fournir un accès au Service conforme au descriptif commercial</li>
                <li>maintenir un taux de disponibilité mensuel visé supérieur ou égal à 99 %</li>
                <li>assurer la mise à jour régulière des sources publiques couvertes</li>
                <li>apporter une assistance par email avec un délai de première réponse inférieur à 2 jours ouvrés</li>
                <li>protéger les données du client selon les mesures décrites dans la{" "}
                  <Link href="/politique-donnees" className="text-primary hover:underline">politique de gestion des données</Link></li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Obligations du client
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>régler le prix de l&apos;abonnement aux échéances convenues</li>
                <li>utiliser le Service dans le cadre de ses propres besoins professionnels internes</li>
                <li>préserver la confidentialité de ses identifiants</li>
                <li>respecter les plafonds d&apos;utilisateurs prévus par sa formule</li>
                <li>se conformer aux CGU et à la législation applicable</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                11. Facturation et comptabilité
              </h2>
              <p>
                Une facture est générée automatiquement à chaque prélèvement et mise à disposition dans l&apos;espace
                client (section Abonnement). Les factures sont conservées dix ans conformément à l&apos;article L.123-22
                du Code de commerce.
              </p>
              <p className="mt-2">
                En cas d&apos;erreur manifeste de facturation, le client dispose d&apos;un délai de 30 jours à compter
                de la réception de la facture pour formuler une réclamation écrite à{" "}
                <a href="mailto:contact@cipia.fr" className="text-primary hover:underline">contact@cipia.fr</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                12. Garanties et limitation de responsabilité
              </h2>
              <p>
                Haruna SARL s&apos;engage sur une obligation de moyens concernant la disponibilité et la qualité
                du Service. Sa responsabilité globale, tous préjudices confondus, est plafonnée au montant
                effectivement versé par le client au titre des douze mois précédant le fait générateur.
              </p>
              <p className="mt-2">
                Sont expressément exclus les dommages indirects ou immatériels : perte d&apos;exploitation, perte de
                chance, atteinte à l&apos;image, perte de données sans lien direct avec une faute caractérisée de
                Haruna SARL.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                13. Force majeure
              </h2>
              <p>
                Aucune partie ne pourra être tenue responsable de l&apos;inexécution de ses obligations en cas de
                force majeure au sens de l&apos;article 1218 du Code civil (panne généralisée d&apos;Internet,
                défaillance d&apos;un fournisseur d&apos;hébergement, ordonnance administrative, conflit armé, etc.).
                Si la situation perdure au-delà de 30 jours, chaque partie pourra résilier le contrat de plein droit.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                14. Médiation et litiges
              </h2>
              <p>
                En cas de différend, les parties privilégient la résolution amiable. Le client consommateur peut
                recourir gratuitement à un médiateur de la consommation conformément à l&apos;article L.616-1 du
                Code de la consommation. Coordonnées du médiateur disponibles sur demande à{" "}
                <a href="mailto:contact@cipia.fr" className="text-primary hover:underline">contact@cipia.fr</a>.
              </p>
              <p className="mt-2">
                Plateforme européenne de Règlement en Ligne des Litiges (RLL) :{" "}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                15. Droit applicable et juridiction compétente
              </h2>
              <p>
                Les présentes CGV sont régies par le droit français. À défaut de résolution amiable, tout litige
                sera soumis aux tribunaux compétents du ressort du siège social de Haruna SARL pour les relations
                entre professionnels. Pour les clients consommateurs, les règles légales de compétence territoriale
                s&apos;appliquent.
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
