import { MetadataRoute } from "next";
import { store } from "@/lib/store";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = store.getAllArticles().filter((a) => a.isApproved);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/news/${article.id}`,
    lastModified: new Date(article.fetchedAt),
    changeFrequency: "daily",
    priority: article.isBreaking ? 1.0 : 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...articleEntries,
  ];
}
