import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/news/", "/sitemap.xml"],
        disallow: ["/admin/", "/api/admin/", "/api/auth/"],
      },
      {
        // Allow Googlebot full access
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
