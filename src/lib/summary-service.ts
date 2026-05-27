// Phase 2.2 — Short-form Inshorts-style summaries (55–65 words) via the
// DigitalOcean Agent (DeepSeek V3.2). One summary per (articleId, lang),
// cached in MongoDB and shared across all users → first user pays the cost,
// everyone else reads it free.
import type { NewsArticle } from "@/types";
import { chat, isDoAgentConfigured } from "./do-agent-client";
import { connectDB } from "./db";
import { SummaryModel } from "@/models/SummaryModel";

const SYSTEM_PROMPT = `You are a news-summarizer for InShorts Nepal, a Nepali news app
that delivers short, neutral summaries in Nepali and English.

TASK: produce a tight 55-65 word summary of the article in TARGET_LANGUAGE.
- Lead with the most important fact (who, what, when, where).
- Then add brief context.
- Preserve all proper nouns, numbers, dates, currencies, places exactly.
- Neutral, journalistic tone. No opinion, no emotive adjectives.
- Self-contained — readable on its own without the source.

NEPALI (ne): natural Nepali at the level of Kantipur / Setopati / Online Khabar.
Devanagari only. End sentences with "।". No Hindi vocabulary, no Hindi script.

ENGLISH (en): clear, neutral journalistic English. No clickbait.

INPUT FORMAT (plain text):
TASK: summarize
TARGET_LANGUAGE: <ne | en>
TITLE: <article title>
BODY: <article body>

OUTPUT FORMAT:
Return ONLY the summary paragraph. No preface, no "Summary:" label, no markdown.

HARD RULES:
- Never invent facts, names, or numbers.
- Never include greetings, sign-offs, or "Here is..." prefixes.
- If input is empty or nonsensical, return exactly: ERROR
`;

export type Lang = "ne" | "en";

function buildPrompt(article: NewsArticle, lang: Lang): string {
  return `TASK: summarize
TARGET_LANGUAGE: ${lang}
TITLE: ${article.title}
BODY: ${article.summary}`;
}

/** Returns a cached summary or generates+caches a new one. Returns null on failure. */
export async function summarizeArticle(article: NewsArticle, lang: Lang): Promise<string | null> {
  if (!isDoAgentConfigured()) return null;
  const dbOk = (await connectDB()) !== null;

  // Cache lookup
  if (dbOk) {
    try {
      const cached = await SummaryModel.findOne({
        articleId: article.id,
        lang,
      }).lean<{ summary: string }>();
      if (cached) return cached.summary;
    } catch (err) {
      console.error("[summary] cache read failed:", err);
    }
  }

  // Generate
  const result = await chat(SYSTEM_PROMPT, buildPrompt(article, lang));
  if (!result || result.content.trim() === "ERROR") return null;
  const summary = result.content.trim();

  // Cache (best-effort)
  if (dbOk) {
    try {
      await SummaryModel.findOneAndUpdate(
        { articleId: article.id, lang },
        { articleId: article.id, lang, summary, modelName: process.env.DO_AGENT_MODEL ?? "deepseek-v3.2" },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("[summary] cache write failed:", err);
    }
  }

  return summary;
}

/**
 * Batch-summarize: only articles without a cached summary actually call the agent.
 * Same parallel-chunked pattern as the translation service.
 */
export async function summarizeBatch(
  articles: NewsArticle[],
  lang: Lang,
  concurrency = 2
): Promise<{ attempted: number; succeeded: number; cached: number }> {
  if (!isDoAgentConfigured()) return { attempted: 0, succeeded: 0, cached: 0 };

  let cached = 0;
  let remaining = articles;
  const dbOk = (await connectDB()) !== null;

  if (dbOk) {
    try {
      const docs = await SummaryModel.find({
        articleId: { $in: articles.map((a) => a.id) },
        lang,
      })
        .select({ articleId: 1, _id: 0 })
        .lean<{ articleId: string }[]>();
      const cachedIds = new Set(docs.map((d) => d.articleId));
      remaining = articles.filter((a) => !cachedIds.has(a.id));
      cached = articles.length - remaining.length;
    } catch (err) {
      console.error("[summary] bulk cache read failed:", err);
    }
  }

  let succeeded = 0;
  for (let i = 0; i < remaining.length; i += concurrency) {
    const chunk = remaining.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map((a) => summarizeArticle(a, lang)));
    for (const r of results) if (r.status === "fulfilled" && r.value) succeeded++;
  }

  return { attempted: articles.length, succeeded, cached };
}

/** Bulk-fetch cached summaries for many articles — used by /api/feed. */
export async function getCachedSummaries(
  articleIds: string[],
  lang: Lang
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (articleIds.length === 0) return out;
  const dbOk = (await connectDB()) !== null;
  if (!dbOk) return out;
  try {
    const docs = await SummaryModel.find({ articleId: { $in: articleIds }, lang })
      .select({ articleId: 1, summary: 1, _id: 0 })
      .lean<{ articleId: string; summary: string }[]>();
    for (const d of docs) out.set(d.articleId, d.summary);
  } catch (err) {
    console.error("[summary] bulk cache fetch failed:", err);
  }
  return out;
}
