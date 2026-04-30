import type { MetadataRoute } from "next";
import path from "path";
import { sector } from "@/config";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = `https://${sector.brand.domain}`;

interface BlogRow {
  slug: string;
  published_at: string | null;
  updated_at?: string | null;
}

function fetchBlogSlugs(): BlogRow[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const dbPath = path.join(process.cwd(), "..", "data", "veille.db");
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT slug, published_at, updated_at
           FROM blog_articles
          WHERE status = 'published'
          ORDER BY published_at DESC`
      )
      .all() as BlogRow[];
    db.close();
    return rows;
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/sources`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/exemple-newsletter`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/inscription`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${BASE_URL}/connexion`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/cgv`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/politique-donnees`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const blogPages: MetadataRoute.Sitemap = fetchBlogSlugs().map((row) => {
    const lastMod = row.updated_at || row.published_at || now.toISOString();
    return {
      url: `${BASE_URL}/blog/${row.slug}`,
      lastModified: new Date(lastMod),
      changeFrequency: "monthly",
      priority: 0.8,
    };
  });

  return [...staticPages, ...blogPages];
}
