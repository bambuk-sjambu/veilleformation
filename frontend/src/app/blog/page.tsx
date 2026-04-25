import Link from "next/link";
import { Metadata } from "next";
import path from "path";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Cipia — Veille Qualiopi | Guides et Conseils Experts",
  description: "Guides pratiques, conseils d'experts et actualités sur la certification Qualiopi, la veille réglementaire et les appels d'offres formation professionnelle.",
  alternates: {
    canonical: "https://cipia.fr/blog/",
  },
  openGraph: {
    title: "Blog Cipia — Veille Qualiopi | Guides et Conseils Experts",
    description: "Guides pratiques, conseils d'experts et actualités sur la certification Qualiopi, la veille réglementaire et les appels d'offres formation professionnelle.",
    url: "https://cipia.fr/blog/",
    type: "website",
    images: [{ url: "https://cipia.fr/og-blog.jpg", width: 1200, height: 630 }],
  },
};

interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
}

function getAllBlogArticles(): BlogArticle[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.cwd(), "..", "data", "veille.db");
    const db = new Database(dbPath, { readonly: true });

    const rows = db
      .prepare(
        `SELECT slug, title, excerpt, category, read_time, published_at
         FROM blog_articles
         WHERE status = 'published'
         ORDER BY published_at DESC, created_at DESC`
      )
      .all() as Array<{
        slug: string;
        title: string;
        excerpt: string;
        category: string;
        read_time: string;
        published_at: string;
      }>;

    db.close();

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      category: row.category,
      readTime: row.read_time,
      date: row.published_at,
      image: "/blog/default.jpg",
    }));
  } catch (err) {
    // DB not yet initialised or table missing — fall back to static placeholder list
    console.warn("blog/page.tsx: could not read blog_articles from DB:", err);
    return STATIC_FALLBACK_ARTICLES;
  }
}

// Shown only when the DB is unavailable (e.g. first deploy before any articles are generated)
const STATIC_FALLBACK_ARTICLES: BlogArticle[] = [
  {
    slug: "guide-qualiopi-2026",
    title: "Comment obtenir la certification Qualiopi en 2026 ?",
    excerpt: "Guide complet pour comprendre le référentiel Qualiopi, préparer les 32 indicateurs et réussir votre audit de certification du premier coup.",
    category: "Qualiopi",
    readTime: "15 min",
    date: "2026-03-15",
    image: "/blog/qualiopi-guide.jpg",
  },
  {
    slug: "veille-reglementaire-qualiopi-indicateur-23",
    title: "Comment mettre en place une veille réglementaire efficace pour Qualiopi ?",
    excerpt: "Méthodologie complète pour satisfaire l'indicateur 23 : sources à surveiller, outils d'automatisation et preuves à fournir lors de l'audit.",
    category: "Veille",
    readTime: "12 min",
    date: "2026-03-10",
    image: "/blog/veille-reglementaire.jpg",
  },
  {
    slug: "appels-offres-formation-professionnelle",
    title: "Comment trouver et répondre aux appels d'offres de formation ?",
    excerpt: "Guide pratique pour identifier les AO publics et privés, construire une offre gagnante et éviter les erreurs fréquentes.",
    category: "Appels d'offres",
    readTime: "14 min",
    date: "2026-03-05",
    image: "/blog/appels-offres.jpg",
  },
  {
    slug: "audit-qualiopi-preparer-son-dossier",
    title: "Comment préparer son dossier d'audit Qualiopi sans stress ?",
    excerpt: "Checklist complète des documents obligatoires, preuves de veille et erreurs à éviter pour réussir votre audit du premier coup.",
    category: "Audit",
    readTime: "18 min",
    date: "2026-02-28",
    image: "/blog/audit-qualiopi.jpg",
  },
  {
    slug: "indicateurs-24-25-26-veille-qualiopi",
    title: "Comment structurer sa veille sur les indicateurs 24, 25 et 26 ?",
    excerpt: "Guide pratique pour la veille compétences, innovations pédagogiques et handicap — 3 indicateurs souvent négligés du référentiel Qualiopi.",
    category: "Veille",
    readTime: "11 min",
    date: "2026-02-20",
    image: "/blog/veille-indicateurs.jpg",
  },
  {
    slug: "sources-veille-formation",
    title: "Quelles sources surveiller pour sa veille réglementaire formation ?",
    excerpt: "Panorama complet des sources nationales, OPCO et régionales à intégrer dans votre stratégie de veille réglementaire.",
    category: "Sources",
    readTime: "10 min",
    date: "2026-02-15",
    image: "/blog/sources-veille.jpg",
  },
];

const categoryColors: Record<string, string> = {
  Qualiopi: "bg-blue-100 text-blue-800",
  Veille: "bg-green-100 text-green-800",
  "Appels d'offres": "bg-purple-100 text-purple-800",
  Audit: "bg-orange-100 text-orange-800",
  Sources: "bg-gray-100 text-gray-800",
  // Categories from generated articles
  "Comparatif": "bg-indigo-100 text-indigo-800",
  "Guide": "bg-teal-100 text-teal-800",
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPage() {
  const articles = getAllBlogArticles();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Blog Cipia",
            description: "Guides et conseils pour les organismes de formation certifiés Qualiopi",
            url: "https://cipia.fr/blog/",
            publisher: {
              "@type": "Organization",
              name: "Cipia",
              url: "https://cipia.fr",
            },
          }),
        }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Blog Cipia — Veille Qualiopi
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Guides pratiques, conseils d&apos;experts et actualités pour les 45 000 organismes de formation certifiés Qualiopi
          </p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <Link href={`/blog/${article.slug}`}>
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-blue-400 text-6xl">📄</span>
                </div>
              </Link>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      categoryColors[article.category] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {article.category}
                  </span>
                  <span className="text-sm text-gray-500">{article.readTime} de lecture</span>
                </div>
                <time className="text-sm text-gray-400 block mb-2">
                  Mis a jour le {formatDate(article.date)}
                </time>
                <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  <Link href={`/blog/${article.slug}`} className="hover:text-blue-600 transition">
                    {article.title}
                  </Link>
                </h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <Link
                  href={`/blog/${article.slug}`}
                  className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800 transition"
                >
                  Lire l&apos;article complet
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Newsletter CTA */}
      <div className="bg-blue-600 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Restez informe des evolutions réglementaires
          </h2>
          <p className="text-blue-100 mb-6">
            Recevez notre newsletter hebdomadaire avec les dernieres publications
            concernant la formation professionnelle.
          </p>
          <Link
            href="/inscription"
            className="inline-block bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-300 transition"
          >
            S&apos;inscrire gratuitement
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2026 Cipia &mdash; Haruna SARL</p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 md:mt-0">
              <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
              <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
              <Link href="/politique-donnees" className="hover:text-white">Politique données</Link>
              <Link href="/cgu" className="hover:text-white">CGU</Link>
              <Link href="/cgv" className="hover:text-white">CGV</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
