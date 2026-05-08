import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CGV Founder Cipia — Conditions spécifiques de l'offre fondateur",
  description:
    "Conditions générales de vente spécifiques à l'offre Cipia Founder (250 places lifetime à 100€ HT, 1000 places sur 5 ans à 150€ HT). Engagement, durée, garanties.",
  alternates: { canonical: "https://cipia.fr/cgv-founder" },
  robots: "index, follow",
};

export default function CgvFounderPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/founders" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour à l&apos;offre Founder
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
          CGV Founder Cipia
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Annexe aux Conditions Générales de Vente — Version en vigueur au 8 mai 2026
        </p>

        <div className="prose prose-gray max-w-none article-content">
          <h2>Préambule</h2>
          <p>
            Les présentes Conditions Générales de Vente Founder (« <strong>CGV Founder</strong> »)
            complètent les <Link href="/cgv">Conditions Générales de Vente</Link> standards de Cipia
            (« <strong>CGV</strong> ») pour toute souscription à l&apos;offre fondatrice Cipia
            (« <strong>Offre Founder</strong> »). En cas de contradiction entre les CGV et les
            présentes CGV Founder, les CGV Founder prévalent pour les souscripteurs concernés.
          </p>

          <h2>Article 1 — Définitions</h2>
          <ul>
            <li>
              <strong>Cipia</strong> : service de veille réglementaire automatisée par
              intelligence artificielle, édité par Haruna SARL, SIREN 752 912 022.
            </li>
            <li>
              <strong>Founder</strong> : tout client ayant souscrit à l&apos;Offre Founder via
              la page <Link href="/founders">cipia.fr/founders</Link>, ayant réglé l&apos;intégralité
              du prix indiqué et reçu sa facture.
            </li>
            <li>
              <strong>Offre Phase 1 « Lifetime »</strong> : offre limitée aux 250 premiers
              Founders inscrits, au prix de 100 € HT (120 € TTC), pour un accès à durée
              indéterminée tant que Cipia opère le service.
            </li>
            <li>
              <strong>Offre Phase 2 « 5 ans »</strong> : offre limitée aux 1 000 Founders
              suivants, au prix de 150 € HT (180 € TTC), pour un accès garanti 5 ans à
              compter de la date de paiement.
            </li>
          </ul>

          <h2>Article 2 — Périmètre de l&apos;Offre Founder</h2>
          <p>
            L&apos;Offre Founder donne accès à l&apos;ensemble des fonctionnalités du plan
            Cipia Solo standard, à savoir :
          </p>
          <ul>
            <li>Veille réglementaire automatisée sur 1 secteur d&apos;activité (par défaut Organismes de Formation Qualiopi pour la Phase 1) ;</li>
            <li>Newsletter hebdomadaire personnalisée ;</li>
            <li>Accès au tableau de bord Cipia (pages veille, appels d&apos;offres, plan d&apos;action) ;</li>
            <li>Export PDF audit Qualiopi (ou audit sectoriel équivalent) en quantité illimitée ;</li>
            <li>Alertes personnalisées par mots-clés et indicateurs ;</li>
            <li>Historique des textes réglementaires sur 24 mois.</li>
          </ul>
          <p>
            L&apos;Offre Founder est nominative et limitée à <strong>un (1) utilisateur</strong>. Les
            usages multi-utilisateurs ou multi-secteurs simultanés relèvent de l&apos;offre Cipia
            Cabinet (199 € HT/an).
          </p>

          <h2>Article 3 — Durée de l&apos;engagement</h2>
          <h3>3.1 Phase 1 « Lifetime »</h3>
          <p>
            L&apos;accès est garanti <strong>tant que Cipia opère le service Cipia</strong>, et au
            <strong> minimum 5 ans</strong> à compter de la date de paiement (durée minimale
            contractuelle).
          </p>
          <p>
            En cas de cessation totale d&apos;activité de Cipia avant 5 ans à compter de la date de
            paiement du Founder, l&apos;éditeur s&apos;engage à rembourser au Founder, au prorata
            temporis sur la base de 60 mois calendaires, la fraction du prix correspondant aux
            mois non livrés. Au-delà de 5 ans, aucun remboursement n&apos;est dû en cas de
            cessation, l&apos;engagement minimal étant rempli.
          </p>

          <h3>3.2 Phase 2 « 5 ans »</h3>
          <p>
            L&apos;accès est garanti <strong>5 ans</strong> à compter de la date de paiement,
            ferme et définitif. Au terme des 5 ans, le compte Founder est automatiquement
            converti en compte gratuit (Newsletter Cipia hebdomadaire), sauf souscription à un
            plan payant standard.
          </p>

          <h2>Article 4 — Évolution du périmètre fonctionnel</h2>
          <p>
            Cipia se réserve le droit de faire évoluer le périmètre fonctionnel pendant la durée
            d&apos;engagement Founder, notamment en cas :
          </p>
          <ul>
            <li>d&apos;évolution du référentiel Qualiopi (V7, V8, etc.) ;</li>
            <li>de modification des sources officielles surveillées (fermeture API Légifrance, ajout/retrait de flux RSS, changement DILA, etc.) ;</li>
            <li>de mise à niveau ou remplacement du modèle d&apos;intelligence artificielle utilisé pour la classification ;</li>
            <li>d&apos;ajout de fonctionnalités nouvelles (incluses sans surcoût pour les Founders).</li>
          </ul>
          <p>
            Toute évolution majeure est communiquée au Founder par email avec un préavis
            raisonnable. Les évolutions n&apos;ouvrent droit à aucun remboursement, l&apos;Offre
            Founder s&apos;adaptant à la régulation en vigueur sans surcoût pour le Founder.
          </p>

          <h2>Article 5 — Cession et reprise de l&apos;activité</h2>
          <p>
            En cas de cession, fusion ou apport partiel d&apos;actif portant sur le service
            Cipia, l&apos;acquéreur s&apos;engage à honorer les engagements Founder pour la durée
            minimum contractuelle restante (jusqu&apos;à 5 ans après la date de paiement initiale).
            Au-delà de cette durée minimale, l&apos;acquéreur peut résilier les comptes Founder
            avec un préavis de 6 mois et remboursement au prorata des engagements restants.
          </p>

          <h2>Article 6 — Garantie « Satisfait ou remboursé » 14 jours</h2>
          <p>
            Le Founder peut demander le remboursement intégral de son achat dans un délai de
            <strong> 14 jours calendaires</strong> à compter de la date de paiement, sans
            justification, par email à{" "}
            <a href="mailto:contact@cipia.fr">contact@cipia.fr</a>. Le remboursement est
            effectué sous 7 jours ouvrés sur la carte bancaire ayant servi au paiement.
            Au-delà de 14 jours, le paiement est considéré comme acquis et non remboursable
            (sauf cas de cessation d&apos;activité prévu à l&apos;article 3.1).
          </p>

          <h2>Article 7 — Prix, paiement, facturation</h2>
          <p>
            Les prix sont exprimés Hors Taxes (HT). La TVA française au taux légal en vigueur
            (20 % au 8 mai 2026) s&apos;applique. Le paiement est intégralement perçu à la
            souscription via Stripe (sécurisation 3D-Secure). Une facture PDF est
            automatiquement émise et envoyée au Founder par email à l&apos;issue de la
            transaction.
          </p>

          <h2>Article 8 — Données personnelles</h2>
          <p>
            Cipia est responsable du traitement des données personnelles collectées au cours
            de la souscription Founder. Les conditions de traitement sont décrites dans la{" "}
            <Link href="/politique-donnees">Politique de protection des données</Link> de
            Cipia. Le Founder dispose d&apos;un droit d&apos;accès, de rectification,
            d&apos;opposition et de portabilité conforme au RGPD, en écrivant à{" "}
            <a href="mailto:contact@cipia.fr">contact@cipia.fr</a>.
          </p>

          <h2>Article 9 — Limitation de responsabilité</h2>
          <p>
            Cipia met en œuvre tous les moyens techniques pour garantir la disponibilité et la
            qualité du service. Toutefois, Cipia ne saurait être tenu responsable des
            interruptions de service liées à des cas de force majeure (panne réseau, panne
            d&apos;un fournisseur d&apos;API officielle, blocage IP par une administration, etc.).
            La responsabilité de Cipia est dans tous les cas limitée au montant payé par le
            Founder pour son Offre.
          </p>
          <p>
            Cipia est un outil d&apos;aide à la veille réglementaire. La responsabilité finale
            de la conformité à la réglementation Qualiopi (ou autre) demeure à la charge du
            Founder. Cipia ne saurait être tenu responsable d&apos;un avis défavorable
            d&apos;auditeur Qualiopi ou d&apos;une sanction administrative.
          </p>

          <h2>Article 10 — Loi applicable et juridiction compétente</h2>
          <p>
            Les présentes CGV Founder sont soumises au droit français. Tout litige relatif à
            leur interprétation ou exécution sera de la compétence exclusive des tribunaux du
            ressort de Bordeaux, sauf disposition impérative contraire.
          </p>

          <hr />

          <p>
            <strong>Pour toute question</strong> sur l&apos;Offre Founder, contactez-nous à{" "}
            <a href="mailto:contact@cipia.fr">contact@cipia.fr</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
