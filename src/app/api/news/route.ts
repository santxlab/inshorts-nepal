import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { fetchAllSources } from "@/lib/rss-fetcher";
import { TopicId } from "@/types";

// Per-language fetch state (module-level, resets on cold start)
const fetchState: Record<string, { inProgress: boolean; lastFetch: number }> = {};

function getState(lang: string) {
  if (!fetchState[lang]) fetchState[lang] = { inProgress: false, lastFetch: 0 };
  return fetchState[lang];
}

// Fire-and-forget background RSS fetch — never blocks the response
function triggerBackgroundFetch(lang: "ne" | "en") {
  const state = getState(lang);
  if (state.inProgress) return;
  // Don't re-fetch more than once every 8 minutes
  if (Date.now() - state.lastFetch < 8 * 60 * 1000) return;

  state.inProgress = true;
  state.lastFetch = Date.now();

  fetchAllSources(lang)
    .catch(() => {})
    .finally(() => { state.inProgress = false; });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") || "ne") as "ne" | "en";
  const category = searchParams.get("category") || "all";
  const topic = searchParams.get("topic") as TopicId | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "40");

  // Always return available articles immediately (no blocking fetch)
  let all = store.getArticles(lang, category as import("@/types").Category);

  // If we have fewer than 20 articles, kick off a background fetch
  // so subsequent requests get more (even if this one returns seed data)
  if (all.length < 20) {
    triggerBackgroundFetch(lang);
  }

  // Filter by topic
  if (topic) {
    const byTopic = all.filter((a) => a.topics?.includes(topic));
    all = byTopic.length >= 3 ? byTopic : all;
  }

  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);

  return NextResponse.json({
    articles: items,
    total: all.length,
    page,
    hasMore: start + limit < all.length,
    fetchingMore: getState(lang).inProgress,
  });
}
