import type { Metadata } from "next";
import SectorLandingPage from "@/components/SectorLandingPage";

export const metadata: Metadata = {
  title: "Cipia OF — Veille Qualiopi automatisée par IA pour organismes de formation",
  description:
    "Indicateurs 23 à 26, décrets formation, appels d'offres OPCO, audit Qualiopi prêt en 1 clic. Newsletter gratuite, Solo 19€/an, Cabinet 199€/an. 14 jours d'essai.",
  alternates: { canonical: "https://cipia.fr/qualiopi" },
};

export default function QualiopiPage() {
  return <SectorLandingPage sectorId="cipia" />;
}
