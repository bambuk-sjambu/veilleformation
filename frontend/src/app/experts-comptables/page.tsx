import type { Metadata } from "next";
import SectorLandingPage from "@/components/SectorLandingPage";

export const metadata: Metadata = {
  title: "Cipia EC — Veille BOFiP et URSSAF pour experts-comptables indépendants",
  description:
    "BOFiP en temps réel, avenants URSSAF, normes OEC, jurisprudence fiscale. La veille comptable et fiscale automatisée par IA. Note de synthèse client en 1 clic. Solo 19€/an.",
  alternates: { canonical: "https://cipia.fr/experts-comptables" },
};

export default function ExpertsComptablesPage() {
  return <SectorLandingPage sectorId="experts-comptables" />;
}
