import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { TopicId } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "ne";
  const category = searchParams.get("category") || "all";
  const topic = searchParams.get("topic") as TopicId | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");

  // Get all articles for language
  let all = store.getArticles(lang as "ne" | "en", category as import("@/types").Category);

  // Filter by topic if provided
  if (topic) {
    all = all.filter((a) => a.topics?.includes(topic));
    // If filtered result is small, also include articles matching by category keywords
    if (all.length < 5) {
      const byCategory = store.getArticles(lang as "ne" | "en", category as import("@/types").Category);
      all = byCategory; // fall back to unfiltered
    }
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
