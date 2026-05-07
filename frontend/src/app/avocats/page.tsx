import type { Metadata } from "next";
import SectorLandingPage from "@/components/SectorLandingPage";

export const metadata: Metadata = {
  title: "Cipia Avocats — Veille jurisprudence et déontologie pour avocats indépendants",
  description:
    "Décisions Cassation et Conseil d'État, déontologie CNB, conventions client. La veille jurisprudence automatisée par IA Anthropic Claude. Solo 19€/an. 14 jours d'essai.",
  alternates: { canonical: "https://cipia.fr/avocats" },
};

export default function AvocatsPage() {
  return <SectorLandingPage sectorId="avocats" />;
}
