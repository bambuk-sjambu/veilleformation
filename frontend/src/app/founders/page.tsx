import type { Metadata } from "next";
import FoundersClient from "./FoundersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cipia Founder — 100€ HT à vie pour 250 organismes de formation Qualiopi",
  description:
    "Offre fondateur exceptionnelle : accès à vie au service Cipia (veille Qualiopi automatisée par IA + audit PDF prêt). 100€ HT one-shot, 250 places limitées aux OF certifiés Qualiopi. Soft launch 22 mai 2026.",
  alternates: { canonical: "https://cipia.fr/founders" },
};

export default function FoundersPage() {
  return <FoundersClient />;
}
