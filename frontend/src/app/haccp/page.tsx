import type { Metadata } from "next";
import SectorLandingPage from "@/components/SectorLandingPage";

export const metadata: Metadata = {
  title: "Cipia HACCP — Veille IA pour restaurateurs, boulangers, traiteurs",
  description:
    "Décrets DGAL, alertes RappelConso et RASFF, audit DGCCRF prêt. La veille HACCP réglementaire automatisée par IA. Newsletter gratuite, Solo 19€/an. 14 jours d'essai.",
  alternates: { canonical: "https://cipia.fr/haccp" },
};

export default function HaccpPage() {
  return <SectorLandingPage sectorId="haccp" />;
}
