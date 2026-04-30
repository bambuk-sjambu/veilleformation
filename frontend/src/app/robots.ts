import type { MetadataRoute } from "next";
import { sector } from "@/config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = `https://${sector.brand.domain}`;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/connexion", "/equipe/invitation"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
