import Link from "next/link";
import { Sparkles } from "lucide-react";
import { sector } from "@/config";

/**
 * 4 mockups d'aperçu du dashboard Cipia : veille, plan d'action,
 * appels d'offres, export PDF. Utilisé sur la home et /founders.
 */
export default function PreviewMockups({
  showCta = true,
}: {
  showCta?: boolean;
}) {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50" id="apercu">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-2">Aperçu</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Voyez l&apos;outil avant de vous inscrire
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Pas de pitch, juste l&apos;outil tel qu&apos;il fonctionne pour les pros
            qui l&apos;utilisent en 2026.
          </p>
        </div>

        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
            <Sparkles className="w-4 h-4" />
            Exemple ci-dessous : secteur OF Qualiopi. Disponible aussi pour HACCP, médical, avocats, experts-comptables.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Mockup 1 — Dashboard veille */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/veille</span>
            </div>
            <div className="p-5 bg-gray-50 min-h-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Veille de la semaine</h3>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">752 articles</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg border-l-4 border-red-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-red-600 font-semibold">IMPACT FORT</span>
                    <span className="text-xs text-gray-400">Indicateur 23</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">Décret n°2026-259 sur la formation pro</p>
                  <p className="text-xs text-gray-500 mt-0.5">JORF · il y a 2 jours</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-amber-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-amber-600 font-semibold">IMPACT MOYEN</span>
                    <span className="text-xs text-gray-400">Indicateur 24</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">Évolution du référentiel ROME 4.0</p>
                  <p className="text-xs text-gray-500 mt-0.5">France Travail · il y a 4 jours</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-green-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-green-600 font-semibold">À EXPLOITER</span>
                    <span className="text-xs text-gray-400">Indicateur 25</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">Nouvelle méthodologie AFEST publiée</p>
                  <p className="text-xs text-gray-500 mt-0.5">Centre Inffo · il y a 5 jours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 2 — Plan d'action Qualiopi */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/plan-action</span>
            </div>
            <div className="p-5 bg-gray-50 min-h-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Plan d&apos;action {sector.vocab.regulatorName}</h3>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Prêt audit</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3">
                  <input type="checkbox" checked readOnly className="w-4 h-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 line-through">Mise à jour module RGPD</p>
                    <p className="text-xs text-gray-500">Sophie · complété 12/04</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Fait</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3">
                  <input type="checkbox" readOnly className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Refonte module IA générative</p>
                    <p className="text-xs text-gray-500">Marc · échéance 15/05</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">En cours</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-3">
                  <input type="checkbox" readOnly className="w-4 h-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Formation formateurs AFEST</p>
                    <p className="text-xs text-gray-500">Équipe pédagogique · 30/05</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">À faire</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 3 — Appels d'offres */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/appels-offres</span>
            </div>
            <div className="p-5 bg-gray-50 min-h-[260px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Appels d&apos;offres formation</h3>
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">155 AO actifs</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded-lg border-l-4 border-amber-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Formation cybersécurité 2026</p>
                      <p className="text-xs text-gray-500 mt-0.5">OPCO 2i · Ile-de-France</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-semibold">J-3</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span><strong className="text-gray-700">85 k€</strong> estimé</span>
                    <span>·</span>
                    <span>Score IA <strong className="text-gray-700">9/10</strong></span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-blue-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Bilan de compétences pour demandeurs d&apos;emploi</p>
                      <p className="text-xs text-gray-500 mt-0.5">BOAMP · Bourgogne-Franche-Comté</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">J-12</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span><strong className="text-gray-700">42 k€</strong> estimé</span>
                    <span>·</span>
                    <span>Score IA <strong className="text-gray-700">7/10</strong></span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border-l-4 border-gray-300 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Formation linguistique salariés industrie</p>
                      <p className="text-xs text-gray-500 mt-0.5">AKTO · Auvergne-Rhône-Alpes</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold">J-25</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span><strong className="text-gray-700">120 k€</strong> estimé</span>
                    <span>·</span>
                    <span>Score IA <strong className="text-gray-700">8/10</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 4 — Export PDF audit */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
              <span className="ml-3 text-xs text-gray-600 font-mono">{sector.brand.domain}/dashboard/export</span>
            </div>
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[260px] flex flex-col items-center justify-center text-center">
              <div className="w-32 h-40 bg-white rounded-lg shadow-md p-3 mb-4 flex flex-col">
                <div className="text-[8px] font-bold text-blue-700 mb-1">RAPPORT {sector.vocab.regulatorName.toUpperCase()}</div>
                <div className="text-[6px] text-gray-700 leading-tight">Veille réglementaire 2026</div>
                <div className="border-t border-gray-200 my-1"></div>
                <div className="space-y-0.5 flex-1">
                  <div className="h-1 bg-gray-300 rounded w-full"></div>
                  <div className="h-1 bg-gray-300 rounded w-5/6"></div>
                  <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-2"></div>
                  <div className="h-1.5 bg-blue-200 rounded w-2/3"></div>
                  <div className="h-1 bg-gray-300 rounded w-full"></div>
                  <div className="h-1 bg-gray-300 rounded w-4/5"></div>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Export PDF {sector.vocab.auditName}</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                Rapport complet en 1 clic : sources surveillées, articles enrichis IA, plan d&apos;action,
                signatures.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Newsletter exemple */}
        {showCta && (
          <div className="bg-blue-700 rounded-2xl p-8 md:p-10 text-center text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              Curieux de la newsletter du mardi ?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Lisez l&apos;édition la plus récente avant même de créer un compte. Pas d&apos;email demandé,
              pas de paywall.
            </p>
            <Link
              href="/exemple-newsletter"
              className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
            >
              Voir un exemple de newsletter →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
