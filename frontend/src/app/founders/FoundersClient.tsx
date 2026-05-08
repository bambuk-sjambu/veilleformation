"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Zap,
  Clock,
  FileText,
  Sparkles,
  AlertCircle,
  Brain,
  ClipboardCheck,
  UserPlus,
  Send,
  Download,
} from "lucide-react";
import { getSectorMeta } from "@/lib/sector-meta";
import PreviewMockups from "@/components/PreviewMockups";

interface FoundersCount {
  activePhase: 1 | 2;
  sold: number;
  cap: number;
  remaining: number;
  isSoldOut: boolean;
}

const PHASE_CONFIG = {
  1: {
    label: "Phase 1 — Founders Lifetime",
    price: 100,
    priceTtc: 120,
    duration: "à vie",
    durationDetail: "tant que Cipia opère, minimum 5 ans contractuels",
    badge: "🔥 OFFRE LANCEMENT",
  },
  2: {
    label: "Phase 2 — Founders 5 ans",
    price: 150,
    priceTtc: 180,
    duration: "5 ans",
    durationDetail: "engagement ferme 5 ans",
    badge: "🟦 OFFRE FONDATEUR",
  },
};

export default function FoundersClient() {
  const [count, setCount] = useState<FoundersCount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Branding OF Qualiopi (cipia)
  const meta = getSectorMeta("cipia");

  useEffect(() => {
    fetch("/api/founders/count")
      .then((r) => r.json())
      .then((d: FoundersCount) => setCount(d))
      .catch(() =>
        setCount({
          activePhase: 1,
          sold: 0,
          cap: 250,
          remaining: 250,
          isSoldOut: false,
        })
      );
  }, []);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/founders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Erreur lors de la création de la session.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Impossible de contacter Stripe.");
      setLoading(false);
    }
  }

  const phase = count?.activePhase || 1;
  const conf = PHASE_CONFIG[phase];
  const sold = count?.sold ?? 0;
  const cap = count?.cap ?? 250;
  const remaining = count?.remaining ?? cap;
  const percentage = cap > 0 ? (sold / cap) * 100 : 0;

  return (
    <main
      className="min-h-screen bg-white"
      style={{
        ["--color-primary" as string]: meta.primary,
        ["--color-primary-dark" as string]: meta.primaryDark,
        ["--color-accent" as string]: meta.accent,
      } as React.CSSProperties}
    >
      {/* Bande sectorielle gradient */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${meta.primary} 0%, ${meta.primaryDark} 60%, ${meta.accent} 100%)`,
        }}
      />

      {/* Header minimal */}
      <header className="border-b" style={{ borderColor: meta.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: meta.primary }}
            >
              C
            </div>
            <span className="font-bold text-lg text-gray-900">Cipia OF</span>
            <span className="text-2xl">🎓</span>
          </Link>
          <Link
            href="/connexion"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Déjà Founder ? Se connecter
          </Link>
        </div>
      </header>

      {/* Hero + offer card */}
      <section
        className="py-16 sm:py-20"
        style={{
          background: `linear-gradient(180deg, ${meta.surface} 0%, white 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6 uppercase tracking-wide"
            style={{ backgroundColor: meta.accent, color: meta.ink }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {conf.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            <span style={{ color: meta.primary }}>{conf.price}€ HT</span>{" "}
            {conf.duration === "à vie" ? "à vie" : "pour 5 ans"}.
            <br />
            Pour les {cap} premiers OF Qualiopi.
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
            Cipia est la veille réglementaire IA pour organismes de formation
            certifiés Qualiopi. Indicateurs 23 à 26 suivis automatiquement,
            audit PDF prêt en 1 clic. Pour les fondateurs : <strong>{conf.price}€ HT</strong> {conf.duration}, {conf.durationDetail}.
          </p>

          {/* Compteur de places */}
          {count && !count.isSoldOut && (
            <div className="max-w-md mx-auto mb-8 bg-white rounded-2xl border-2 p-5" style={{ borderColor: meta.primary }}>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  Places vendues
                </span>
                <span className="text-2xl font-extrabold" style={{ color: meta.primaryDark }}>
                  {sold} / {cap}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(2, percentage)}%`,
                    background: `linear-gradient(90deg, ${meta.primary}, ${meta.accent})`,
                  }}
                />
              </div>
              <p className="text-sm font-medium mt-3" style={{ color: meta.primaryDark }}>
                {remaining} places restantes
              </p>
            </div>
          )}

          {count?.isSoldOut ? (
            <div className="max-w-md mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
              <p className="font-bold text-red-700 mb-2">
                Toutes les places Founder sont vendues 🎉
              </p>
              <p className="text-sm text-red-600 mb-4">
                Vous pouvez quand même vous inscrire à Cipia Solo (39€/an) ou
                Cipia Cabinet (199€/an).
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800"
              >
                Voir les abonnements <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-lg shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: meta.primary,
                  boxShadow: `0 15px 35px -10px ${meta.primary}80`,
                }}
              >
                {loading ? (
                  <>Chargement…</>
                ) : (
                  <>
                    Devenir Founder pour {conf.price}€ HT
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Paiement sécurisé Stripe • Facture PDF envoyée automatiquement
              </p>
              <div className="mt-6 max-w-md mx-auto bg-red-600 text-white rounded-2xl px-6 py-4 shadow-lg border-4 border-red-700">
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  ✓ Garantie 14 jours satisfait ou remboursé
                </p>
                <p className="text-sm font-medium opacity-95 mt-1">
                  Sans justification. Remboursement intégral par Stripe sous 7 jours.
                </p>
              </div>

              {error && (
                <div className="mt-4 max-w-md mx-auto p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Pourquoi Cipia OF */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            Ce que vous obtenez avec votre place Founder
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Audit Qualiopi prêt en 1 clic",
                body: "PDF avec votre logo, indicateurs 23 à 26 renseignés, preuves de veille datées. Présentez-le tel quel à votre auditeur.",
              },
              {
                icon: Zap,
                title: "Veille IA automatisée",
                body: "Anthropic Claude lit chaque texte (Légifrance, BOAMP, JORF, OPCO), résume et classe par indicateur Qualiopi. Vous recevez la newsletter du mardi.",
              },
              {
                icon: Clock,
                title: "Économie de 3 à 5h par mois",
                body: "Plus besoin de scroller manuellement Légifrance et les bulletins OPCO. Tout arrive trié et hiérarchisé. Et 6 à 8h en moins le jour de votre audit Qualiopi.",
              },
              {
                icon: FileText,
                title: "Plan d'action automatisé",
                body: "Chaque texte à fort impact devient une fiche d'action assignable. Suivi audit-ready avec historique horodaté.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border-2 flex gap-4"
                style={{ borderColor: meta.surface }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: meta.surface, color: meta.primary }}
                >
                  <feat.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: meta.primaryDark }}>
                    {feat.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feat.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain points : la veille réglementaire sans effort */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              La veille réglementaire sans effort
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              45 000 organismes de formation Qualiopi ont le même besoin : rester en règle.
              Cipia le résout par IA en une newsletter hebdomadaire.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                Icon: Clock,
                title: "3 heures gagnées chaque semaine",
                description:
                  "Légifrance, BOAMP, 11 OPCO, France Travail, 13 Régions : toutes les sources collectées et synthétisées pour vous.",
              },
              {
                Icon: Brain,
                title: "Classification IA instantanée",
                description:
                  "Chaque texte est automatiquement rattaché aux indicateurs 23, 24, 25 ou 26 par l'IA Anthropic Claude, avec justification claire.",
              },
              {
                Icon: ClipboardCheck,
                title: "Audit préparé en 1 clic",
                description:
                  "Exportez un PDF daté et structuré qui prouve votre veille régulière aux auditeurs Qualiopi.",
              },
            ].map((b, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border"
                style={{ backgroundColor: meta.surface, borderColor: meta.surface }}
              >
                <div style={{ color: meta.primary }} className="mb-4">
                  <b.Icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-gray-600">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-20" style={{ backgroundColor: meta.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Comment ça marche
            </h2>
            <p className="text-lg text-gray-600">
              En 3 étapes simples, votre veille Qualiopi est en place.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                num: "1",
                Icon: UserPlus,
                title: "Devenez Founder",
                description: "Paiement 100€ HT one-shot via Stripe. Compte activé sous 5 min par email.",
              },
              {
                num: "2",
                Icon: Send,
                title: "Recevez votre newsletter",
                description: "Chaque mardi à 8h, un résumé complet de la veille de la semaine dans votre boîte mail.",
              },
              {
                num: "3",
                Icon: Download,
                title: "Documentez votre veille",
                description: "Exportez le PDF de preuve, prêt à présenter lors de votre audit Qualiopi.",
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-16 h-16 rounded-full text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
                  style={{ backgroundColor: meta.primary }}
                >
                  {step.num}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span style={{ color: meta.primary }}>
                    <step.Icon className="w-6 h-6" />
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Aperçu mockups dashboard */}
      <PreviewMockups showCta={false} />

      {/* Cipia automatise tout */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Cipia automatise tout, peu importe votre secteur
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Concentrez-vous sur votre cœur de métier. On s&apos;occupe de la veille.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border-2" style={{ borderColor: meta.surface }}>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl"
                style={{ backgroundColor: meta.surface }}
              >
                📡
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: meta.primaryDark }}>
                Sources élargies
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Légifrance, BOAMP, RappelConso, ANSM, BOFiP, Judilibre, Cassation, OPCO,
                France Travail : nous agrégeons les sources officielles de vos 5 secteurs.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2" style={{ borderColor: meta.surface }}>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl"
                style={{ backgroundColor: meta.surface }}
              >
                🧠
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: meta.primaryDark }}>
                Classification IA par taxonomie de votre secteur
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                L&apos;IA Anthropic Claude classe chaque texte selon la taxonomie de votre
                métier — indicateurs Qualiopi 23-26 pour les OF, principes HACCP,
                recommandations HAS, jurisprudence par chambre, BOFiP fiscal…
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border-2" style={{ borderColor: meta.surface }}>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl"
                style={{ backgroundColor: meta.surface }}
              >
                📄
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: meta.primaryDark }}>
                Export PDF prêt pour l&apos;audit
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Générez un document PDF structuré, daté et complet, à présenter à votre
                auditeur Qualiopi, contrôle DDPP, audit HACCP, ou inspection ANSM selon
                votre secteur.
              </p>
            </div>
          </div>

          {/* Aperçu newsletter du mardi */}
          <div
            className="mt-12 rounded-2xl p-6 sm:p-8 text-center"
            style={{
              background: `linear-gradient(135deg, ${meta.primary}, ${meta.primaryDark})`,
            }}
          >
            <p className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Curieux de la newsletter du mardi&nbsp;?
            </p>
            <p className="text-base sm:text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Voyez exactement à quoi ressemble votre veille livrée chaque mardi
              à 8h&nbsp;: textes officiels résumés, classés par indicateur, prêts
              à présenter en réunion équipe ou en audit.
            </p>
            <Link
              href="/exemple-newsletter"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white font-bold text-base shadow-lg transition-transform hover:scale-105"
              style={{ color: meta.primaryDark }}
            >
              Voir un exemple complet
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Comparaison Founder vs concurrents */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: meta.surface }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3" style={{ color: meta.primaryDark }}>
            Cipia Founder, comparé au marché
          </h2>
          <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            Coût total sur 5 ans pour un OF Qualiopi, audit-ready inclus.
          </p>
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Solution</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Tarif</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Coût 5 ans</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Audit PDF auto</th>
                  <th className="text-center p-3 font-semibold text-gray-700">IA classification</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-b border-gray-100"
                  style={{ backgroundColor: meta.surface }}
                >
                  <td className="p-3 font-bold" style={{ color: meta.primaryDark }}>
                    🏆 Cipia Founder
                  </td>
                  <td className="text-center p-3 font-bold" style={{ color: meta.primary }}>
                    {conf.price}€ HT à vie
                  </td>
                  <td className="text-center p-3 font-bold" style={{ color: meta.primary }}>
                    {conf.price}€
                  </td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅ Claude</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-700">Cipia Solo (récurrent)</td>
                  <td className="text-center p-3 text-gray-600">39€ HT/an</td>
                  <td className="text-center p-3 text-gray-600">195€</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3">✅ Claude</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-700">VeilleFormation.com</td>
                  <td className="text-center p-3 text-gray-600">39 à 97€/mois</td>
                  <td className="text-center p-3 font-bold text-red-600">2 350 - 5 850€</td>
                  <td className="text-center p-3">✅</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-3 font-medium text-gray-700">Digiforma Veille (CRM)</td>
                  <td className="text-center p-3 text-gray-600">Gratuit (produit appel)</td>
                  <td className="text-center p-3 text-gray-600">0€</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-700">Veille manuelle (Drive + classeur)</td>
                  <td className="text-center p-3 text-gray-600">0€ + 6h/audit</td>
                  <td className="text-center p-3 text-gray-600">~30h de prép</td>
                  <td className="text-center p-3 text-gray-400">❌ (manuel)</td>
                  <td className="text-center p-3 text-gray-400">❌</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 border-2" style={{ borderColor: meta.primary }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: meta.primary }}>
                Vs VeilleFormation
              </p>
              <p className="text-2xl font-extrabold" style={{ color: meta.primaryDark }}>
                ÷25 à ÷60
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Cipia Founder coûte 25 à 60 fois moins cher sur 5 ans pour un service IA-native équivalent.
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 border-2" style={{ borderColor: meta.primary }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: meta.primary }}>
                Vs Cipia Solo récurrent
              </p>
              <p className="text-2xl font-extrabold" style={{ color: meta.primaryDark }}>
                Rentable dès 2 ans 7 mois
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Solo récurrent = 39€/an. Sur 5 ans = 195€. Vous économisez 95€ avec Founder, et plus encore au-delà.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "C'est quoi exactement « à vie » et est-ce que Cipia va durer ?",
                a: "À vie = tant que Cipia continue d'opérer le service. Et Cipia est conçu pour durer : c'est un opérateur multi-secteurs (5 verticaux : OF Qualiopi, HACCP, médical libéral, avocats, experts-comptables — TAM cumulé 596 000 structures FR). Pas un mono-produit fragile. Si une source officielle change ou si un secteur évolue, les autres continuent de tourner et financent l'ensemble. Le service est porté par Hi-Commerce SAS (8 ans, 650+ clients SEO, RCS Bordeaux 909 044 632) — pas une startup qui doit lever pour survivre. Et nos CGV Founder garantissent un engagement minimum de 5 ans contractuels : si Cipia cessait l'activité avant 5 ans, vous seriez remboursé au prorata des années restantes. Au-delà de 5 ans, votre accès continue tant que Cipia est en activité.",
              },
              {
                q: "Pourquoi seulement 250 places ?",
                a: "Pour valoriser nos fondateurs et garder un volume tenable. Au-delà, l'offre Phase 2 (150€ HT pour 5 ans, 1000 places) prendra le relais. Quand toutes les places Founder sont vendues, le tarif normal est de 39€ HT/an récurrent (Cipia Solo) — toujours 12 fois moins cher que VeilleFormation.com.",
              },
              {
                q: "Et si Qualiopi V7 sort dans 2 ans ?",
                a: "Toutes les évolutions du référentiel Qualiopi sont incluses dans votre place Founder, sans surcoût. C'est notre engagement : on s'adapte à la régulation, vous restez Founder.",
              },
              {
                q: "Comment je récupère mon accès après paiement ?",
                a: "Stripe nous envoie la confirmation de paiement, vous recevez sous 5 minutes un email avec votre facture PDF et un lien pour activer votre compte (choix du mot de passe). Connexion immédiate ensuite.",
              },
              {
                q: "Garantie satisfait ou remboursé ?",
                a: "14 jours satisfait ou remboursé sans justification. Vous testez Cipia, et si ça ne vous convient pas, on vous rembourse intégralement par Stripe.",
              },
              {
                q: "Pour combien d'utilisateurs ?",
                a: "Une place Founder = 1 utilisateur, 1 secteur (OF Qualiopi). Pour avoir plusieurs utilisateurs ou plusieurs secteurs (ex: HACCP + médical), il faudra passer sur Cipia Cabinet (199€/an).",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 bg-white"
              >
                <summary className="cursor-pointer p-5 font-semibold text-gray-900 flex items-center justify-between hover:bg-gray-50 list-none">
                  <span>{item.q}</span>
                  <span className="ml-4 text-gray-400 transition-transform group-open:rotate-45 text-xl">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-gray-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      {!count?.isSoldOut && (
        <section className="py-16 sm:py-20 bg-gray-900">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Encore {remaining} places.
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              {conf.price}€ HT, {conf.duration}, garantie 14 jours.
            </p>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: meta.accent, color: meta.ink }}
            >
              Devenir Founder
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Cipia. Tous droits réservés.</p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/cgv" className="hover:text-gray-700">CGV</Link>
              <Link href="/cgu" className="hover:text-gray-700">CGU</Link>
              <Link href="/cgv-founder" className="hover:text-gray-700 font-medium">CGV Founder</Link>
              <Link href="/mentions-legales" className="hover:text-gray-700">Mentions légales</Link>
              <Link href="/confidentialite" className="hover:text-gray-700">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
