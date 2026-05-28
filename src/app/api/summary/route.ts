// Phase 2.2 — GET /api/summary?articleId=<id>&lang=<ne|en>
//
// ON-DEMAND, SHARED, CACHE-FIRST AI summary (DeepSeek V3.2 via DO Agent).
//
// We deliberately do NOT pre-generate summaries for every article (that burns
// tokens on stories nobody opens). Instead the mobile app calls this endpoint
// the moment a user taps the "✨ सारांश" pill:
//   • If a summary for (articleId, lang) is already cached → return it, NO LLM
//     call. So the first reader pays the cost once and every reader after them
//     (User 2, User 3, …) reads it free. This is also what makes the planned
//     "summaries cost diamonds" phase safe — generation only ever happens on an
//     explicit tap.
//   • Otherwise generate it, cache it (summarizeArticle handles both), return it.
import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { connectDB } from "@/lib/db";
import { ArticleModel } from "@/models/ArticleModel";
import { SummaryModel } from "@/models/SummaryModel";
import { summarizeArticle } from "@/lib/summary-service";
import type { SummaryMode } from "@/models/SummaryModel";
import { isDoAgentConfigured } from "@/lib/do-agent-client";
import type { NewsArticle, Category } from "@/types";

export const dynamic = "force-dynamic";

// Find an article by id: fast in-memory path, then the persistent Mongo copy
// (so summaries still work after the in-memory cap has evicted the article).
async function lookupArticle(id: string): Promise<NewsArticle | null> {
  const inMem = store.getAllArticles().find((a) => a.id === id);
  if (inMem) return inMem;
  const conn = await connectDB();
  if (!conn) return null;
  try {
    const doc = await ArticleModel.findOne({ articleId: id }).lean<{
      articleId: string; title: string; summary: string; language: "ne" | "en";
      category: string; sourceName: string; sourceUrl: string; publishedAt: Date;
      fetchedAt: Date; isApproved: boolean;
    }>();
    if (!doc) return null;
    return {
      id: doc.articleId, title: doc.title, summary: doc.summary,
      language: doc.language, category: doc.category as Category,
      sourceName: doc.sourceName, sourceUrl: doc.sourceUrl,
      publishedAt: doc.publishedAt.toISOString(),
      fetchedAt: doc.fetchedAt.toISOString(), isApproved: doc.isApproved,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get("articleId") || searchParams.get("id");
  const lang = (searchParams.get("lang") || "ne") as "ne" | "en";
  // Length: "short" (30–40 words) for the in-app card pill, "long" (60–70) for
  // the full-story reader. Defaults to short — the card is the common caller.
  const mode: SummaryMode = searchParams.get("mode") === "long" ? "long" : "short";

  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  // Cheap cache check first — avoids even touching the article lookup when a
  // summary already exists (the common case once an article is popular).
  try {
    const conn = await connectDB();
    if (conn) {
      const cached = await SummaryModel.findOne({ articleId, lang, mode })
        .select({ summary: 1, _id: 0 })
        .lean<{ summary: string }>();
      if (cached?.summary) {
        return NextResponse.json({ summary: cached.summary, cached: true });
      }
    }
  } catch { /* fall through to generation */ }

  if (!isDoAgentConfigured()) {
    return NextResponse.json(
      { error: "summarizer not configured", summary: null },
      { status: 503 }
    );
  }

  const article = await lookupArticle(articleId);
  if (!article) {
    return NextResponse.json({ error: "article not found", summary: null }, { status: 404 });
  }

  // summarizeArticle re-checks the cache then generates + persists on a miss.
  const summary = await summarizeArticle(article, lang, mode);
  if (!summary) {
    return NextResponse.json(
      { error: "summarization failed", summary: null },
      { status: 502 }
    );
  }

  return NextResponse.json({ summary, cached: false });
}
