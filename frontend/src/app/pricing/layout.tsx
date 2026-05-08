import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs Cipia — Newsletter gratuite, Founder 100€ à vie, Solo 39€/an, Cabinet 199€/an",
  description:
    "Veille réglementaire IA pour 596 000 indépendants et cabinets français. Newsletter gratuite, abonnement low-cost, et offre fondateur à vie limitée à 250 places. Comparatif vs VeilleFormation : ÷6 à ÷25 sur 5 ans.",
  alternates: { canonical: "https://cipia.fr/pricing" },
  openGraph: {
    title: "Tarifs Cipia",
    description:
      "Newsletter 0€ · Founder 100€ HT à vie (250 places) · Solo 39€ HT/an · Cabinet 199€ HT/an. Veille réglementaire IA pour 5 secteurs.",
    url: "https://cipia.fr/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs Cipia",
    description: "Newsletter 0€ · Founder 100€ HT à vie · Solo 39€ HT/an · Cabinet 199€ HT/an.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
