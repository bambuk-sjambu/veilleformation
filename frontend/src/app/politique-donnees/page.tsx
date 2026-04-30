import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { sector } from "@/config";

export const metadata = {
  title: `Politique de gestion des données utilisateur | ${sector.brand.name}`,
  description: `Politique de gestion des données utilisateur de ${sector.brand.name}, conforme au RGPD et à la loi Informatique et Libertés (Haruna SARL).`,
};

export default function PolitiqueDonneesPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Politique de gestion des données utilisateur
          </h1>
          <p className="text-sm text-gray-500 mb-8">Conforme au RGPD et à la loi Informatique et Libertés — version du 24 avril 2026</p>

          <section className="space-y-6 text-gray-600">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                1. Cadre et engagements
              </h2>
              <p>
                <strong>Haruna SARL</strong>, éditeur du service {sector.brand.name}, traite les données personnelles de ses
                utilisateurs conformément :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>au Règlement (UE) 2016/679 du 27 avril 2016 (« RGPD »)</li>
                <li>à la loi n° 78-17 du 6 janvier 1978 modifiée (« Informatique et Libertés »)</li>
                <li>aux lignes directrices et recommandations de la CNIL</li>
                <li>aux lignes directrices du Comité européen de la protection des données (CEPD)</li>
              </ul>
              <p className="mt-2">
                La présente politique complète la{" "}
                <Link href="/confidentialite" className="text-primary hover:underline">politique de confidentialité</Link>.
                Elle détaille les modalités opérationnelles de gestion, de conservation et de protection des données.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                2. Principes appliqués
              </h2>
              <p>Haruna SARL met en œuvre les principes fondamentaux du RGPD (article 5) :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Licéité, loyauté, transparence :</strong> chaque traitement repose sur une base légale claire et est documenté dans un registre des traitements</li>
                <li><strong>Limitation des finalités :</strong> les données sont collectées pour des finalités déterminées et explicites</li>
                <li><strong>Minimisation :</strong> seules les données strictement nécessaires sont collectées</li>
                <li><strong>Exactitude :</strong> un processus de mise à jour et de correction est disponible dans l&apos;espace personnel de chaque utilisateur</li>
                <li><strong>Limitation de conservation :</strong> les données sont conservées pour la durée strictement nécessaire (voir section 5)</li>
                <li><strong>Intégrité et confidentialité :</strong> les mesures techniques et organisationnelles sont détaillées en section 7</li>
                <li><strong>Responsabilité :</strong> Haruna SARL peut démontrer à tout moment sa conformité via la documentation interne</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                3. Responsable de traitement et contact
              </h2>
              <ul className="space-y-1">
                <li><strong>Responsable de traitement :</strong> Haruna SARL, représentée par son gérant Stéphane Jambu</li>
                <li><strong>Contact données personnelles :</strong> <a href={`mailto:contact@${sector.brand.domain}`} className="text-primary hover:underline">{`contact@${sector.brand.domain}`}</a></li>
                <li><strong>Coordonnées postales :</strong> voir <Link href="/mentions-legales" className="text-primary hover:underline">mentions légales</Link></li>
              </ul>
              <p className="mt-2">
                Haruna SARL n&apos;est pas tenue de désigner un Délégué à la Protection des Données (DPO) au sens
                de l&apos;article 37 du RGPD à ce jour. Un DPO externe sera désigné si les seuils ou la nature des
                traitements l&apos;imposent à l&apos;avenir.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                4. Cartographie des traitements
              </h2>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Traitement</th>
                      <th className="text-left py-2">Base légale</th>
                      <th className="text-left py-2">Données</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Gestion des comptes utilisateur</td>
                      <td className="py-2 align-top">Exécution du contrat</td>
                      <td className="py-2 align-top">Identité, email, mot de passe chiffré</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Newsletter gratuite</td>
                      <td className="py-2 align-top">Consentement</td>
                      <td className="py-2 align-top">Email, préférences</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Abonnements payants</td>
                      <td className="py-2 align-top">Exécution du contrat</td>
                      <td className="py-2 align-top">Identité, coordonnées facturation, historique Stripe</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Export audit Qualiopi</td>
                      <td className="py-2 align-top">Exécution du contrat</td>
                      <td className="py-2 align-top">Profil organisme (SIRET, NDE, responsable)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Support client</td>
                      <td className="py-2 align-top">Intérêt légitime</td>
                      <td className="py-2 align-top">Email, contenu de la demande</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Sécurité et journalisation</td>
                      <td className="py-2 align-top">Intérêt légitime / obligation légale</td>
                      <td className="py-2 align-top">Logs d&apos;accès, adresse IP</td>
                    </tr>
                    <tr>
                      <td className="py-2 align-top">Statistiques agrégées</td>
                      <td className="py-2 align-top">Intérêt légitime</td>
                      <td className="py-2 align-top">Données anonymisées d&apos;usage</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                5. Durées de conservation
              </h2>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Catégorie</th>
                      <th className="text-left py-2">Durée active</th>
                      <th className="text-left py-2">Archivage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Compte utilisateur</td>
                      <td className="py-2 align-top">Durée d&apos;utilisation du service</td>
                      <td className="py-2 align-top">3 ans après dernière connexion</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Données de facturation</td>
                      <td className="py-2 align-top">Durée du contrat</td>
                      <td className="py-2 align-top">10 ans (obligation comptable, art. L.123-22 C. com.)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Preuve de consentement newsletter</td>
                      <td className="py-2 align-top">Durée de l&apos;abonnement</td>
                      <td className="py-2 align-top">3 ans après désinscription</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Logs techniques</td>
                      <td className="py-2 align-top">6 mois</td>
                      <td className="py-2 align-top">—</td>
                    </tr>
                    <tr>
                      <td className="py-2 align-top">Demandes de support</td>
                      <td className="py-2 align-top">2 ans après clôture</td>
                      <td className="py-2 align-top">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                À l&apos;issue des durées ci-dessus, les données sont supprimées ou anonymisées de façon irréversible.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                6. Sous-traitants et transferts
              </h2>
              <p>
                Haruna SARL recourt à des sous-traitants qualifiés, chacun lié par un accord de traitement
                des données (DPA) conforme à l&apos;article 28 du RGPD :
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Sous-traitant</th>
                      <th className="text-left py-2">Rôle</th>
                      <th className="text-left py-2">Localisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Hetzner Online GmbH</td>
                      <td className="py-2 align-top">Hébergement applicatif et base de données</td>
                      <td className="py-2 align-top">Allemagne (UE)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Stripe Payments Europe Ltd.</td>
                      <td className="py-2 align-top">Traitement des paiements</td>
                      <td className="py-2 align-top">Irlande (UE)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Sendinblue SAS (Brevo)</td>
                      <td className="py-2 align-top">Envoi de la newsletter hebdomadaire</td>
                      <td className="py-2 align-top">France (UE)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Resend, Inc.</td>
                      <td className="py-2 align-top">Emails transactionnels</td>
                      <td className="py-2 align-top">USA (CCT)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 align-top">Anthropic PBC</td>
                      <td className="py-2 align-top">Classification IA d&apos;articles publics</td>
                      <td className="py-2 align-top">USA (CCT)</td>
                    </tr>
                    <tr>
                      <td className="py-2 align-top">OVH SAS</td>
                      <td className="py-2 align-top">Nom de domaine</td>
                      <td className="py-2 align-top">France (UE)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                <strong>Transferts hors UE :</strong> les transferts vers les sous-traitants établis aux États-Unis
                sont encadrés par les Clauses Contractuelles Types (CCT) adoptées par la Commission européenne
                (décision 2021/914), complétées par les mesures supplémentaires prévues par les recommandations
                CEPD 01/2020. Aucune donnée personnelle sensible au sens de l&apos;article 9 du RGPD n&apos;est traitée.
              </p>
              <p className="mt-2">
                La liste des sous-traitants est tenue à jour et communiquée par email aux clients abonnés
                au moins 30 jours avant l&apos;ajout d&apos;un nouveau sous-traitant susceptible de traiter
                leurs données.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                7. Mesures de sécurité
              </h2>
              <p>Haruna SARL applique les mesures techniques et organisationnelles suivantes :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Chiffrement en transit :</strong> TLS 1.3, HSTS actif, certificats Let&apos;s Encrypt renouvelés automatiquement</li>
                <li><strong>Chiffrement au repos :</strong> volumes disque chiffrés côté hébergeur, mots de passe stockés via bcrypt (coût ≥ 12)</li>
                <li><strong>Authentification :</strong> sessions signées et chiffrées via iron-session, protection CSRF, rate limiting des endpoints sensibles</li>
                <li><strong>Cloisonnement :</strong> accès serveur limité à un nombre restreint de postes administrateurs authentifiés par clé SSH</li>
                <li><strong>Sauvegardes :</strong> sauvegardes quotidiennes automatiques de la base de données, chiffrées et archivées sur un stockage distinct</li>
                <li><strong>Journalisation :</strong> logs d&apos;accès applicatifs et d&apos;administration conservés 6 mois</li>
                <li><strong>Mises à jour :</strong> application régulière des correctifs de sécurité (OS, dépendances applicatives)</li>
                <li><strong>Sensibilisation :</strong> les personnes habilitées à accéder aux données sont formées aux bonnes pratiques</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                8. Droits des utilisateurs
              </h2>
              <p>Conformément aux articles 15 à 22 du RGPD, chaque utilisateur dispose des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Accès (art. 15) :</strong> obtenir copie des données le concernant</li>
                <li><strong>Rectification (art. 16) :</strong> corriger des données inexactes ou incomplètes</li>
                <li><strong>Effacement (art. 17) :</strong> obtenir la suppression des données, sous réserve des obligations légales de conservation</li>
                <li><strong>Limitation (art. 18) :</strong> demander la suspension du traitement</li>
                <li><strong>Portabilité (art. 20) :</strong> recevoir ses données dans un format structuré et lisible par machine</li>
                <li><strong>Opposition (art. 21) :</strong> s&apos;opposer à un traitement fondé sur l&apos;intérêt légitime</li>
                <li><strong>Directives post-mortem :</strong> définir le sort des données après décès (art. 85 de la loi Informatique et Libertés)</li>
                <li><strong>Retrait du consentement :</strong> à tout moment, sans effet rétroactif</li>
              </ul>
              <p className="mt-2">
                <strong>Modalités d&apos;exercice :</strong> toute demande peut être adressée par email à{" "}
                <a href={`mailto:contact@${sector.brand.domain}`} className="text-primary hover:underline">{`contact@${sector.brand.domain}`}</a>,
                accompagnée d&apos;une copie d&apos;une pièce d&apos;identité. Haruna SARL répond dans un délai
                maximum d&apos;un mois, prolongeable de deux mois pour les demandes complexes (art. 12 RGPD).
                L&apos;exercice des droits est gratuit, sauf demandes manifestement abusives.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                9. Gestion des violations de données
              </h2>
              <p>
                En cas de violation de données personnelles (fuite, accès non autorisé, perte, divulgation accidentelle),
                Haruna SARL met en œuvre la procédure suivante, conforme aux articles 33 et 34 du RGPD :
              </p>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>Identification et qualification de la violation dans les meilleurs délais</li>
                <li>Contenu et caractérisation : nature, volume de données, catégories de personnes concernées, conséquences probables, mesures correctives</li>
                <li><strong>Notification à la CNIL dans un délai maximum de 72 heures</strong> si la violation est susceptible d&apos;engendrer un risque pour les droits et libertés des personnes</li>
                <li><strong>Information des personnes concernées</strong> dans les meilleurs délais si la violation est susceptible d&apos;engendrer un risque élevé</li>
                <li>Documentation interne de l&apos;incident dans le registre des violations</li>
                <li>Analyse post-incident et mise en œuvre d&apos;actions correctives durables</li>
              </ol>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                10. Cookies et traceurs
              </h2>
              <p>
                {sector.brand.name} n&apos;utilise que des cookies strictement nécessaires au fonctionnement du Service
                (authentification, sécurité CSRF). Ces cookies sont exemptés de consentement au sens de
                l&apos;article 82 de la loi Informatique et Libertés. Aucun cookie de mesure d&apos;audience,
                aucun cookie publicitaire, aucun traceur tiers n&apos;est déposé.
              </p>
              <p className="mt-2">
                Si des outils de mesure d&apos;audience ou d&apos;aide à l&apos;amélioration du Service venaient
                à être ajoutés, un bandeau de consentement conforme aux lignes directrices CNIL serait mis en place.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                11. Registre des traitements
              </h2>
              <p>
                Conformément à l&apos;article 30 du RGPD, Haruna SARL tient un registre interne des activités
                de traitement. Ce registre, mis à jour régulièrement, est tenu à la disposition de la CNIL
                sur demande.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                12. Réclamation auprès de l&apos;autorité de contrôle
              </h2>
              <p>
                Tout utilisateur qui estime que le traitement de ses données ne respecte pas la réglementation
                peut introduire une réclamation auprès de la CNIL :
              </p>
              <ul className="mt-2 space-y-1">
                <li><strong>Adresse :</strong> 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
                <li><strong>Téléphone :</strong> +33 (0)1 53 73 22 22</li>
                <li><strong>Site :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a></li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                13. Évolutions de la présente politique
              </h2>
              <p>
                Haruna SARL peut être amenée à faire évoluer cette politique pour tenir compte d&apos;évolutions
                légales, réglementaires ou techniques. Les modifications substantielles font l&apos;objet d&apos;une
                information aux utilisateurs par email et/ou par une bannière dans le Service, au moins 30 jours
                avant leur entrée en vigueur.
              </p>
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
