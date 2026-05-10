import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { fetchAllSources } from "@/lib/rss-fetcher";
import { TopicId } from "@/types";

// Module-level flag so we only auto-fetch once per serverless instance
let autoFetchDone = false;
let autoFetchInProgress = false;

async function ensureFreshArticles(lang: "ne" | "en") {
  // If already fetched this instance, skip
  if (autoFetchDone || autoFetchInProgress) return;

  const all = store.getArticles(lang);
  // Seed data has ≤ 13 articles — if we're at/near seed count, fetch real RSS
  if (all.length <= 13) {
    autoFetchInProgress = true;
    try {
      await fetchAllSources(lang);
      autoFetchDone = true;
    } catch {
      // non-fatal — seed data still shows
    } finally {
      autoFetchInProgress = false;
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") || "ne") as "ne" | "en";
  const category = searchParams.get("category") || "all";
  const topic = searchParams.get("topic") as TopicId | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "40");

  // Auto-fetch RSS on cold start
  await ensureFreshArticles(lang);

  // Get all articles for language
  let all = store.getArticles(lang, category as import("@/types").Category);

  // Filter by topic if provided
  if (topic) {
    const byTopic = all.filter((a) => a.topics?.includes(topic));
    all = byTopic.length >= 5 ? byTopic : all; // fall back if too few
  }

  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return NextResponse.json({
    articles: items,
    total: all.length,
    page,
    hasMore: start + limit < all.length,
  });
}
