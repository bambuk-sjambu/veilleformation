import type { Metadata } from "next";
import ActivationClient from "./ActivationClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activer mon compte Founder — Cipia",
  description:
    "Définissez votre mot de passe pour activer votre compte Cipia Founder.",
  robots: "noindex, nofollow",
};

export default function ActivationPage() {
  return <ActivationClient />;
}
