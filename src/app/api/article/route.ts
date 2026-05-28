// GET /api/article?id=<id>&lang=<ne|en>
//
// Returns a SINGLE article as JSON — used by the mobile app when a push
// notification is tapped, so it can render that story as a native card instead
// of jumping straight to the web reader. Mirrors the lookup the /news/<id> page
// uses (in-memory store first, then the persistent Mongo copy), and attaches a
// cached AI summary if one already exists (so the card's Saransh pill can open
// instantly without an extra round-trip).
import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { connectDB } from "@/lib/db";
import { ArticleModel } from "@/models/ArticleModel";
import { SummaryModel } from "@/models/SummaryModel";
import type { NewsArticle, Category } from "@/types";

export const dynamic = "force-dynamic";

async function lookupArticle(id: string): Promise<NewsArticle | null> {
  const inMem = store.getAllArticles().find((a) => a.id === id);
  if (inMem) return inMem;
  const conn = await connectDB();
  if (!conn) return null;
  try {
    const doc = await ArticleModel.findOne({ articleId: id }).lean<{
      articleId: string; title: string; summary: string; fullContent?: string;
      imageUrl?: string; sourceUrl: string; sourceName: string; category: string;
      topics?: string[]; language: "ne" | "en"; origin?: "np" | "in" | "global";
      publishedAt: Date; fetchedAt: Date; isApproved: boolean; isBreaking?: boolean;
      readTimeSeconds?: number; viewCount?: number;
    }>();
    if (!doc) return null;
    return {
      id: doc.articleId, title: doc.title, summary: doc.summary,
      imageUrl: doc.imageUrl, sourceUrl: doc.sourceUrl, sourceName: doc.sourceName,
      category: doc.category as Category, topics: doc.topics as NewsArticle["topics"],
      language: doc.language, origin: doc.origin,
      publishedAt: doc.publishedAt.toISOString(), fetchedAt: doc.fetchedAt.toISOString(),
      isApproved: doc.isApproved, isBreaking: doc.isBreaking,
      readTimeSeconds: doc.readTimeSeconds, viewCount: doc.viewCount,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || searchParams.get("articleId");
  const lang = (searchParams.get("lang") || "ne") as "ne" | "en";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const article = await lookupArticle(id);
  if (!article) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Attach an already-cached SHORT (card-length) summary, read-only — never
  // generates here. The card pill uses the short form; the modal will fetch
  // on demand if this isn't cached yet.
  try {
    const conn = await connectDB();
    if (conn) {
      const s = await SummaryModel.findOne({ articleId: id, lang, mode: "short" })
        .select({ summary: 1, _id: 0 })
        .lean<{ summary: string }>();
      if (s?.summary) (article as NewsArticle).aiSummary = s.summary;
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ article });
}
