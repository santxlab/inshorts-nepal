import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { Language, Category } from "@/types";

// Case-insensitive token match: every whitespace-separated token in the query
// must appear in title or summary. Works for both Latin and Devanagari since
// we toLowerCase + substring on the original strings.
function tokenMatch(haystack: string, tokens: string[]): boolean {
  const h = haystack.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const lang = (searchParams.get("lang") || "ne") as Language;
  const category = (searchParams.get("category") || "all") as Category;
  const limit = Math.min(parseInt(searchParams.get("limit") || "40"), 100);

  if (!q) {
    return NextResponse.json({ articles: [], total: 0, q });
  }

  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);

  const all = store.getArticles(lang, category);
  const matched = all.filter(
    (a) => tokenMatch(a.title, tokens) || tokenMatch(a.summary, tokens),
  );

  // Title hits rank above summary-only hits, then newest first.
  matched.sort((a, b) => {
    const aTitle = tokenMatch(a.title, tokens) ? 1 : 0;
    const bTitle = tokenMatch(b.title, tokens) ? 1 : 0;
    if (aTitle !== bTitle) return bTitle - aTitle;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return NextResponse.json({
    articles: matched.slice(0, limit),
    total: matched.length,
    q,
  });
}
