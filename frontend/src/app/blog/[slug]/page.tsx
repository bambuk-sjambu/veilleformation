import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "path";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Author {
  slug: string;
  name: string;
  title: string;
  bio: string;
  linkedin: string;
  initials: string;
  color: string;
}

interface Article {
  id: number;
  slug: string;
  title: string;
  h1: string;
  excerpt: string;
  category: string;
  cluster: string;
  funnel: string;
  keyword_main: string;
  content_html: string;
  meta_description: string;
  word_count: number;
  read_time: string;
  published_at: string;
  updated_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Auteurs fictifs (E-E-A-T) — à remplacer par vrais experts
// ---------------------------------------------------------------------------
const AUTHORS: Record<string, Author> = {
  "sophie-marchand": {
    slug: "sophie-marchand",
    name: "Sophie Marchand",
    title: "Consultante Qualiopi & Formation Professionnelle",
    bio: "11 ans d'expérience dans le conseil aux organismes de formation. Sophie a accompagné plus de 80 OF dans l'obtention de leur certification Qualiopi et la mise en conformité réglementaire. Ancienne responsable formation en entreprise, elle intervient régulièrement comme experte auprès d'OPCO et de France Compétences.",
    linkedin: "https://www.linkedin.com/",
    initials: "SM",
    color: "bg-blue-600",
  },
  "marc-dubois": {
    slug: "marc-dubois",
    name: "Marc Dubois",
    title: "Expert Innovation Pédagogique & Digital Learning",
    bio: "Formateur certifié e-learning depuis 2015 et spécialiste des outils digitaux pour organismes de formation. Marc accompagne les OF dans la transformation pédagogique liée aux indicateurs 25 et 26 du référentiel Qualiopi. Contributeur actif au FFFOD et observateur des tendances EdTech.",
    linkedin: "https://www.linkedin.com/",
    initials: "MD",
    color: "bg-teal-600",
  },
};

function getAuthor(category: string, cluster: string): Author {
  const pedagogique = ["Outils", "Innovation", "Pédagogie", "Handicap", "Comparatif"];
  if (pedagogique.some((k) => category.includes(k) || cluster.includes(k))) {
    return AUTHORS["marc-dubois"];
  }
  return AUTHORS["sophie-marchand"];
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------
function getArticle(slug: string): Article | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.cwd(), "..", "data", "veille.db");
    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare(
        `SELECT id, slug, title, h1, excerpt, category, cluster, funnel,
                keyword_main, content_html, meta_description, word_count, read_time,
                published_at, updated_at, created_at
         FROM blog_articles
         WHERE slug = ? AND status = 'published'`
      )
      .get(slug) as Article | undefined;
    db.close();
    return row ?? null;
  } catch {
    return null;
  }
}

function getRelatedArticles(
  currentSlug: string,
  cluster: string,
  limit = 3
): Pick<Article, "slug" | "title" | "excerpt" | "category" | "read_time">[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.cwd(), "..", "data", "veille.db");
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT slug, title, excerpt, category, read_time
         FROM blog_articles
         WHERE status = 'published' AND slug != ? AND cluster = ?
         ORDER BY published_at DESC
         LIMIT ?`
      )
      .all(currentSlug, cluster, limit) as Pick<
      Article,
      "slug" | "title" | "excerpt" | "category" | "read_time"
    >[];
    db.close();
    return rows;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Extract FAQs from content_html for JSON-LD
// ---------------------------------------------------------------------------
function extractFaqs(html: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  const faqSection = html.match(/<h2[^>]*>.*?FAQ.*?<\/h2>([\s\S]*?)(?=<h2|$)/i);
  if (!faqSection) return faqs;
  const faqHtml = faqSection[1];
  const questions = [
    ...faqHtml.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/gi),
  ];
  for (const m of questions) {
    const question = m[1].replace(/<[^>]+>/g, "").trim();
    const answer = m[2].replace(/<[^>]+>/g, "").trim();
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Extract H2 headings for Table of Contents
// ---------------------------------------------------------------------------
function extractToc(html: string): { id: string; title: string }[] {
  const toc: { id: string; title: string }[] = [];
  const matches = [
    ...html.matchAll(/<h2[^>]*(?:id="([^"]*)")?[^>]*>([\s\S]*?)<\/h2>/gi),
  ];
  for (const m of matches) {
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const id =
      m[1] ||
      title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (title) toc.push({ id, title });
  }
  return toc;
}

// ---------------------------------------------------------------------------
// Inject IDs into H2 tags for anchor links
// ---------------------------------------------------------------------------
function injectH2Ids(html: string): string {
  return html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_match, attrs, inner) => {
    const title = inner.replace(/<[^>]+>/g, "").trim();
    const id = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (attrs.includes("id=")) return `<h2${attrs}>${inner}</h2>`;
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article non trouvé" };

  const canonicalUrl = `https://cipia.fr/blog/${slug}/`;

  // Use full title in HTML tags — browsers/Google truncate for display automatically.
  // Only breadcrumb JSON-LD item uses a shorter version to avoid generic labels in SERPs.
  return {
    title: article.title,
    description: article.meta_description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: article.title,
      description: article.meta_description,
      url: canonicalUrl,
      type: "article",
      publishedTime: article.published_at,
      images: [
        {
          url: `https://cipia.fr/og-blog-${slug}.jpg`,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.meta_description,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const author = getAuthor(article.category, article.cluster);
  const relatedArticles = getRelatedArticles(slug, article.cluster);
  const faqs = extractFaqs(article.content_html);
  const toc = extractToc(article.content_html);
  const contentWithIds = injectH2Ids(article.content_html);

  const canonicalUrl = `https://cipia.fr/blog/${slug}/`;
  const publishedDate = new Date(article.published_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.meta_description,
    image: `https://cipia.fr/og-blog-${slug}.jpg`,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.title,
      url: `https://cipia.fr/blog/auteurs/${author.slug}/`,
    },
    publisher: {
      "@type": "Organization",
      name: "Cipia",
      url: "https://cipia.fr",
      logo: {
        "@type": "ImageObject",
        url: "https://cipia.fr/logo.png",
        width: 200,
        height: 60,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    wordCount: article.word_count,
    keywords: [
      article.keyword_main,
      article.cluster,
      article.category !== article.cluster ? article.category : null,
      "formation professionnelle",
      "Qualiopi",
      "organisme de formation",
    ].filter(Boolean).join(", "),
  };

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: "https://cipia.fr/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://cipia.fr/blog/",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title.length > 60
          ? article.title.substring(0, 57).replace(/\s\S*$/, "") + "…"
          : article.title,
        item: canonicalUrl,
      },
    ],
  };

  const categoryColors: Record<string, string> = {
    Qualiopi: "bg-blue-100 text-blue-800",
    Veille: "bg-green-100 text-green-800",
    Outils: "bg-indigo-100 text-indigo-800",
    Audit: "bg-orange-100 text-orange-800",
    Sources: "bg-gray-100 text-gray-800",
    Guide: "bg-teal-100 text-teal-800",
    Comparatif: "bg-purple-100 text-purple-800",
  };
  const catColor = categoryColors[article.category] || "bg-gray-100 text-gray-800";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Cipia
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/connexion" className="text-sm text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-300 transition"
              >
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-blue-600">
                Accueil
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blog" className="hover:text-blue-600">
                Blog
              </Link>
            </li>
            <li>/</li>
            <li>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${catColor}`}>
                {article.category}
              </span>
            </li>
          </ol>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-12">
          {/* Article principal */}
          <main>
            {/* En-tête */}
            <header className="mb-8">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${catColor}`}
              >
                {article.category}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
                {article.h1}
              </h1>
              <p className="text-lg text-gray-600 mb-6">{article.excerpt}</p>

              {/* Meta auteur */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full ${author.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  >
                    {author.initials}
                  </div>
                  <span>
                    Par{" "}
                    <Link
                      href={`/blog/auteurs/${author.slug}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {author.name}
                    </Link>
                  </span>
                </div>
                <span>·</span>
                <time dateTime={article.published_at}>Mis à jour le {publishedDate}</time>
                <span>·</span>
                <span>{article.read_time} de lecture</span>
                {article.word_count > 0 && (
                  <>
                    <span>·</span>
                    <span>{article.word_count.toLocaleString("fr-FR")} mots</span>
                  </>
                )}
              </div>
            </header>

            {/* Résumé rapide */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-5 mb-8">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 text-xl mt-0.5 flex-shrink-0">💡</span>
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Résumé rapide</p>
                  <p className="text-blue-800 text-sm leading-relaxed">{article.excerpt}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {article.cluster}
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      {article.funnel === "TOFU"
                        ? "Guide débutant"
                        : article.funnel === "MOFU"
                        ? "Guide intermédiaire"
                        : "Guide avancé"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ToC mobile */}
            {toc.length > 0 && (
              <div className="lg:hidden bg-white border rounded-xl p-5 mb-8">
                <p className="font-semibold text-gray-900 mb-3 text-sm">Dans cet article</p>
                <ol className="space-y-2">
                  {toc.map((item, i) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-400 font-mono text-xs mt-1 w-5 flex-shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <a
                        href={`#${item.id}`}
                        className="text-blue-600 hover:underline leading-snug"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Contenu HTML */}
            <style>{`
              .article-content { color:#374151; font-size:1.0625rem; line-height:1.8; }
              .article-content h1 { font-size:1.875rem; font-weight:700; color:#111827; margin:0 0 1rem; line-height:1.3; }
              .article-content h2 { font-size:1.5rem; font-weight:700; color:#111827; margin:2.5rem 0 1rem; padding-bottom:.5rem; border-bottom:2px solid #E5E7EB; line-height:1.35; }
              .article-content h3 { font-size:1.2rem; font-weight:600; color:#1F2937; margin:1.75rem 0 .75rem; line-height:1.4; }
              .article-content p { margin-bottom:1.25rem; color:#374151; line-height:1.8; }
              .article-content ul { margin:.25rem 0 1.25rem 1.75rem; list-style-type:disc; color:#374151; }
              .article-content ol { margin:.25rem 0 1.25rem 1.75rem; list-style-type:decimal; color:#374151; }
              .article-content li { margin-bottom:.4rem; line-height:1.7; }
              .article-content li::marker { color:#2563EB; }
              .article-content strong { font-weight:600; color:#111827; }
              .article-content a { color:#2563EB; text-decoration:underline; text-underline-offset:3px; }
              .article-content a:hover { color:#1D4ED8; }
              .article-content table { width:100%; border-collapse:collapse; margin-bottom:1.5rem; font-size:.95rem; }
              .article-content th { background:#EFF6FF; font-weight:600; color:#1E40AF; padding:.75rem 1rem; text-align:left; border:1px solid #DBEAFE; }
              .article-content td { padding:.65rem 1rem; border:1px solid #E5E7EB; color:#374151; }
              .article-content tr:nth-child(even) td { background:#F9FAFB; }
              .article-content blockquote { border-left:4px solid #2563EB; padding:.75rem 1.25rem; background:#EFF6FF; margin:1.5rem 0; border-radius:0 .5rem .5rem 0; font-style:italic; color:#1E40AF; }
              .article-content details { border:1px solid #E5E7EB; border-radius:.5rem; margin-bottom:.75rem; overflow:hidden; }
              .article-content summary { cursor:pointer; padding:1rem 1.25rem; font-weight:600; color:#111827; background:#F9FAFB; list-style:none; display:flex; align-items:center; justify-content:space-between; user-select:none; }
              .article-content summary::-webkit-details-marker { display:none; }
              .article-content summary::after { content:"+"; font-size:1.25rem; color:#2563EB; font-weight:400; }
              .article-content details[open] summary::after { content:"−"; }
              .article-content details[open] summary { border-bottom:1px solid #E5E7EB; }
              .article-content details > *:not(summary) { padding:1rem 1.25rem; }
              .article-content details p:last-child { margin-bottom:0; }
              .article-content .cta-block { margin:2rem 0; border-radius:.75rem; }
              .article-content code { background:#F3F4F6; padding:.15rem .4rem; border-radius:.25rem; font-size:.9em; color:#1F2937; }
            `}</style>
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />

            {/* CTA box */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 my-8 text-white">
              <h3 className="text-lg font-bold mb-2">Automatisez votre veille Qualiopi</h3>
              <p className="text-blue-100 text-sm mb-4">
                Recevez chaque semaine les textes réglementaires résumés par IA, classifiés par
                indicateur. Preuves d&apos;audit incluses.
              </p>
              <Link
                href="/inscription"
                className="inline-block bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-lg hover:bg-yellow-300 transition"
              >
                Essai gratuit — sans CB
              </Link>
            </div>

            {/* Articles liés */}
            {relatedArticles.length > 0 && (
              <section className="mt-10 pt-8 border-t">
                <h2 className="text-xl font-bold text-gray-900 mb-5">Articles liés</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {relatedArticles.map((a) => (
                    <article
                      key={a.slug}
                      className="bg-white rounded-lg border hover:shadow-md transition p-4"
                    >
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          categoryColors[a.category] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {a.category}
                      </span>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                        <Link href={`/blog/${a.slug}`} className="hover:text-blue-600">
                          {a.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{a.read_time} de lecture</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Box auteur */}
            <section className="mt-10 pt-8 border-t">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                À propos de l&apos;auteur·e
              </p>
              <div className="bg-white rounded-xl border p-6 flex items-start gap-5">
                <div
                  className={`w-16 h-16 rounded-full ${author.color} flex-shrink-0 flex items-center justify-center text-white text-xl font-bold`}
                >
                  {author.initials}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/blog/auteurs/${author.slug}`}
                    className="text-lg font-bold text-gray-900 hover:text-blue-600"
                  >
                    {author.name}
                  </Link>
                  <p className="text-sm text-blue-600 mb-3">{author.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{author.bio}</p>
                  <a
                    href={author.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    Voir le profil LinkedIn
                  </a>
                </div>
              </div>
            </section>
          </main>

          {/* Sidebar desktop */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 bg-white border rounded-xl p-5">
                <p className="font-semibold text-gray-900 mb-4 text-sm">Dans cet article</p>
                <ol className="space-y-2.5">
                  {toc.map((item, i) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="text-blue-400 font-mono text-xs mt-1 w-5 flex-shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <a
                        href={`#${item.id}`}
                        className="text-sm text-gray-600 hover:text-blue-600 leading-snug transition"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 pt-5 border-t">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Automatisez votre veille</p>
                  <Link
                    href="/inscription"
                    className="block text-center bg-yellow-400 text-black text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-yellow-300 transition"
                  >
                    Essai gratuit
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2026 Cipia &mdash; Haruna SARL</p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 md:mt-0 text-sm">
              <Link href="/blog" className="hover:text-white">Blog</Link>
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
