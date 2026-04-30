import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { sector } from "@/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl = `https://${sector.brand.domain}`;
const titleDefault = `${sector.brand.name} · ${sector.brand.tagline}`;
// Twitter description : variante plus orientee audience (vocab specifique au secteur).
// Refactore en A.2 quand vocab.audience sera utilise ici.
const twitterDescription =
  "Textes réglementaires, appels d'offres et innovations pédagogiques classés par IA pour organismes de formation Qualiopi.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: titleDefault,
    template: `%s · ${sector.brand.name}`,
  },
  description: sector.brand.description,
  applicationName: sector.brand.name,
  authors: [{ name: "Stéphane Jambu", url: "https://www.linkedin.com/in/stephane-jambu/" }],
  creator: "Stéphane Jambu",
  publisher: sector.brand.name,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: titleDefault,
    description: sector.brand.description,
    url: siteUrl,
    siteName: sector.brand.name,
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        // Alt avec vocab Qualiopi : refactore en A.2 quand vocab.* sera utilise ici.
        alt: `${sector.brand.name} — veille Qualiopi automatisée par IA`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description: twitterDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
  category: "business",
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
