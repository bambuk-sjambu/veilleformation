import PricingTestClient from "./PricingTestClient";

export const metadata = {
  title: "Cipia — Tarifs beta",
  description:
    "La veille réglementaire qui change tout. Toute la veille de votre métier classée par IA. Pour les indépendants comme pour les cabinets.",
  robots: "noindex, nofollow",
};

export default function PricingTestPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold mb-6 uppercase tracking-wide">
              Beta — Pré-inscriptions ouvertes
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              Cipia. La veille réglementaire qui{" "}
              <span className="text-primary">change tout.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Toute la veille réglementaire de votre métier classée par IA.
              Pour les indépendants comme pour les cabinets.
            </p>
          </div>

          <PricingTestClient />

          <p className="text-xs text-gray-500 text-center mt-10 max-w-xl mx-auto">
            Aucun paiement n&apos;est demandé à ce stade. Les souscriptions
            seront activées à l&apos;ouverture de la beta. Vos données ne sont
            utilisées que pour vous prévenir.
          </p>
        </div>
      </section>
    </main>
  );
}
