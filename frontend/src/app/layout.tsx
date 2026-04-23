import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const siteUrl = "https://cipia.fr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cipia · Veille Qualiopi IA livrée chaque mardi à 8h",
    template: "%s · Cipia",
  },
  description:
    "Textes réglementaires, appels d'offres et innovations pédagogiques classés par IA selon les indicateurs Qualiopi 23-26. Export PDF prêt pour l'audit.",
  applicationName: "Cipia",
  authors: [{ name: "Stéphane Jambu", url: "https://www.linkedin.com/in/stephane-jambu/" }],
  creator: "Stéphane Jambu",
  publisher: "Cipia",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Cipia · Veille Qualiopi IA livrée chaque mardi à 8h",
    description:
      "Textes réglementaires, appels d'offres et innovations pédagogiques classés par IA selon les indicateurs Qualiopi 23-26. Export PDF prêt pour l'audit.",
    url: siteUrl,
    siteName: "Cipia",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cipia — veille Qualiopi automatisée par IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cipia · Veille Qualiopi IA livrée chaque mardi à 8h",
    description:
      "Textes réglementaires, appels d'offres et innovations pédagogiques classés par IA pour organismes de formation Qualiopi.",
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
