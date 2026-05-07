import type { Metadata } from "next";
import SectorLandingPage from "@/components/SectorLandingPage";

export const metadata: Metadata = {
  title: "Cipia Médical — Veille IA pour médecins, kinés, ostéos, infirmiers libéraux",
  description:
    "Alertes ANSM, recommandations HAS, conventions Sécurité Sociale, déontologie. La veille médicale réglementaire automatisée par IA. Solo 19€/an. 14 jours d'essai.",
  alternates: { canonical: "https://cipia.fr/medical" },
};

export default function MedicalPage() {
  return <SectorLandingPage sectorId="medical" />;
}
