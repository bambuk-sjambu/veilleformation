import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ALL_SECTOR_IDS, getSectorMeta } from "@/lib/sector-meta";

const SECTOR_TAGLINES: Record<string, string> = {
  cipia: "Indicateurs 23-26, OPCO, audit Qualiopi prêt en 1 clic",
  haccp: "DGAL, RappelConso, RASFF — votre prochain contrôle DGCCRF est calme",
  medical: "ANSM, HAS, conventions Sécu — la veille médicale en 30 sec/sem",
  avocats: "Cassation, Conseil d'État, déontologie CNB — vos arrêts résumés",
  "experts-comptables": "BOFiP, URSSAF, OEC — note de synthèse client en 1 clic",
};

const SECTOR_SLUGS: Record<string, string> = {
  cipia: "/qualiopi",
  haccp: "/haccp",
  medical: "/medical",
  avocats: "/avocats",
  "experts-comptables": "/experts-comptables",
};

/**
 * Sélecteur 5 secteurs en home (pivot X.3.b).
 * Permet à un visiteur de cliquer sur son métier et arriver sur la
 * landing dédiée. Chaque carte porte la palette du secteur.
 */
export default function SectorSelectorCards() {
  return (
    <section className="py-16 sm:py-20 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Pour votre métier
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            5 verticaux. 1 seule IA.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Cipia adapte ses sources, son vocabulaire et son audit PDF à votre
            métier. Choisissez le vôtre.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {ALL_SECTOR_IDS.map((id) => {
            const meta = getSectorMeta(id);
            const slug = SECTOR_SLUGS[id] || `/${id}`;
            const tagline = SECTOR_TAGLINES[id] || meta.longLabel;
            return (
              <Link
                key={id}
                href={slug}
                className="group relative flex flex-col p-5 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{
                  borderColor: meta.surface,
                  backgroundColor: "white",
                }}
              >
                {/* Bande sectorielle au top */}
                <span
                  className="absolute top-0 left-4 right-4 h-1 rounded-b-full"
                  style={{
                    background: `linear-gradient(90deg, ${meta.primary}, ${meta.accent})`,
                  }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 mt-2"
                  style={{
                    backgroundColor: meta.surface,
                    color: meta.primary,
                  }}
                >
                  {meta.emoji}
                </div>
                <h3
                  className="font-bold text-base mb-1"
                  style={{ color: meta.primaryDark }}
                >
                  {meta.shortLabel}
                </h3>
                <p className="text-xs text-gray-500 mb-3 leading-snug flex-grow">
                  {tagline}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-0.5"
                  style={{ color: meta.primary }}
                >
                  Découvrir
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
