import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VeilleFormation.fr — La veille Qualiopi automatisée par IA",
  description:
    "Veille réglementaire automatisée pour les organismes de formation certifiés Qualiopi. Résumés IA, classification par indicateur, newsletter hebdomadaire, export PDF audit.",
  keywords:
    "veille qualiopi, veille réglementaire formation, organisme de formation, certification qualiopi, indicateurs qualiopi, audit qualiopi",
  openGraph: {
    title: "VeilleFormation.fr — La veille Qualiopi automatisée par IA",
    description:
      "Veille réglementaire automatisée pour les organismes de formation certifiés Qualiopi.",
    url: "https://veilleformation.fr",
    siteName: "VeilleFormation.fr",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VeilleFormation.fr — La veille Qualiopi automatisée par IA",
    description:
      "Veille réglementaire automatisée pour les organismes de formation certifiés Qualiopi.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
