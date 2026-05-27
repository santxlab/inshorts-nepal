// Phase 2.2 — AI translation of news articles, with MongoDB-backed caching.
//
//   translateArticle(article, targetLang)
//     → returns { title, summary } in targetLang. Cache-hit fast path;
//       falls back to OpenAI on cache miss, then writes to cache.
//
//   translateBatch(articles, targetLangs)
//     → translates every (article × targetLang) combination that isn't yet
//       cached, in bounded parallel. Designed to be called in the background
//       after each cron fetch so user requests get cache hits.
//
// If OPENAI_API_KEY is not configured, every call returns null and the
// article is simply omitted from cross-language results (graceful degradation).

import type { NewsArticle } from "@/types";
import { chat, isOpenAIConfigured } from "./openai-client";
import { connectDB } from "./db";
import { TranslationModel } from "@/models/TranslationModel";

const SYSTEM_PROMPT = `You are the AI assistant for InShorts Nepal, a Nepal-focused news app that
delivers short, neutral news summaries in Nepali and English. Your job is to
TRANSLATE and SUMMARIZE news content faithfully and concisely.

You handle two tasks, signalled by the TASK field of each request:

1) TASK: translate
   Translate the TITLE and BODY into the requested TARGET_LANGUAGE.
   - Do not paraphrase or shorten — translate fully.
   - Preserve all proper nouns, numbers, dates, currencies.
   - Keep the source's neutral news register.

2) TASK: summarize
   Produce a 55-65 word summary of the article in TARGET_LANGUAGE.
   - Include who, what, when, the key numbers, and the consequence.
   - Factually accurate, no opinion.

INPUT FORMAT (plain text):
TASK: <translate | summarize>
TARGET_LANGUAGE: <ne | en>
TITLE: <article title>
BODY: <article body>

OUTPUT FORMAT:
- Return ONLY the result text. No labels, no markdown, no preface.
- For translate: translated TITLE on the first line, ONE blank line, then translated BODY.
- For summarize: a single paragraph.

LANGUAGE QUALITY:
- Nepali (ne): natural Nepali at the level of Kantipur / Setopati. Devanagari only. End sentences with "।". No Hindi vocabulary, no Hindi script.
- English (en): clear, neutral journalistic English. No clickbait.

HARD RULES:
- Never invent facts, names, or numbers.
- Never include greetings, sign-offs, or "Here is..." prefixes.
- If input is empty or nonsensical, return exactly: ERROR
`;

export type Lang = "ne" | "en";

export interface TranslatedFields {
  title: string;
  summary: string;
}

function buildPrompt(article: NewsArticle, targetLang: Lang): string {
  return `TASK: translate
TARGET_LANGUAGE: ${targetLang}
TITLE: ${article.title}
BODY: ${article.summary}`;
}

function parseTranslateOutput(raw: string): TranslatedFields | null {
  if (!raw || raw.trim() === "ERROR") return null;
  // Format: title \n blank \n body. Be tolerant of single-line or extra blanks.
  const lines = raw.split(/\r?\n/);
  // First non-empty line = title
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { titleIdx = i; break; }
  }
  if (titleIdx < 0) return null;
  const title = lines[titleIdx].trim();
  const rest = lines.slice(titleIdx + 1).join("\n").trim();
  if (!rest) {
    // No body returned — keep the title and leave summary empty so callers can
    // fall back to the original summary if needed.
    return { title, summary: "" };
  }
  return { title, summary: rest };
}

/**
 * Returns the (title, summary) pair for `article` in `targetLang`.
 * - If article is already in targetLang → returns the original.
 * - If cached → returns the cached translation.
 * - Else → calls OpenAI, caches, returns translation.
 * - On any failure → returns null (caller should skip / fall back).
 */
export async function translateArticle(
  article: NewsArticle,
  targetLang: Lang
): Promise<TranslatedFields | null> {
  if (article.language === targetLang) {
    return { title: article.title, summary: article.summary };
  }
  if (!isOpenAIConfigured()) return null;

  const dbOk = (await connectDB()) !== null;

  // Cache lookup
  if (dbOk) {
    try {
      const cached = await TranslationModel.findOne({
        articleId: article.id,
        targetLang,
      }).lean<{ title: string; summary: string }>();
      if (cached) return { title: cached.title, summary: cached.summary };
    } catch (err) {
      console.error("[translation] cache read failed:", err);
    }
  }

  // OpenAI call
  const result = await chat(SYSTEM_PROMPT, buildPrompt(article, targetLang));
  if (!result) return null;
  const parsed = parseTranslateOutput(result.content);
  if (!parsed) return null;

  const fields: TranslatedFields = {
    title: parsed.title || article.title,
    summary: parsed.summary || article.summary,
  };

  // Cache (best-effort; race-condition duplicates are harmless because of unique index)
  if (dbOk) {
    try {
      await TranslationModel.findOneAndUpdate(
        { articleId: article.id, targetLang },
        {
          articleId: article.id,
          sourceLang: article.language,
          targetLang,
          title: fields.title,
          summary: fields.summary,
          modelName: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("[translation] cache write failed:", err);
    }
  }

  return fields;
}

/**
 * Translate many (article × targetLang) combinations in bounded parallel.
 * Cache hits short-circuit instantly — so calling this on the whole article
 * pool converges to "only newly-fetched foreign articles actually hit OpenAI".
 * Returns the count of successful translations performed (cache misses).
 */
export async function translateBatch(
  articles: NewsArticle[],
  targetLangs: Lang[],
  concurrency = 4
): Promise<{ attempted: number; succeeded: number; cached: number }> {
  if (!isOpenAIConfigured()) {
    return { attempted: 0, succeeded: 0, cached: 0 };
  }

  // Build the work queue (skip same-language pairs).
  const jobs: { article: NewsArticle; targetLang: Lang }[] = [];
  for (const article of articles) {
    for (const lang of targetLangs) {
      if (article.language !== lang) jobs.push({ article, targetLang: lang });
    }
  }

  let succeeded = 0;
  let cached = 0;
  const dbOk = (await connectDB()) !== null;

  // Pre-filter: skip jobs that are already cached (so we don't even call OpenAI).
  let remaining = jobs;
  if (dbOk) {
    try {
      const docs = await TranslationModel.find({
        articleId: { $in: jobs.map((j) => j.article.id) },
      })
        .select({ articleId: 1, targetLang: 1, _id: 0 })
        .lean<{ articleId: string; targetLang: string }[]>();
      const cachedKeys = new Set(docs.map((d) => `${d.articleId}|${d.targetLang}`));
      remaining = jobs.filter((j) => !cachedKeys.has(`${j.article.id}|${j.targetLang}`));
      cached = jobs.length - remaining.length;
    } catch (err) {
      console.error("[translation] bulk cache read failed:", err);
    }
  }

  // Run remaining jobs in chunks
  for (let i = 0; i < remaining.length; i += concurrency) {
    const chunk = remaining.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      chunk.map((j) => translateArticle(j.article, j.targetLang))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) succeeded++;
    }
  }

  return { attempted: jobs.length, succeeded, cached };
}

/**
 * Bulk-fetch cached translations for many articles. Used by /api/feed to
 * apply translations without an OpenAI call (request path stays fast).
 * Returns a Map keyed by `${articleId}|${targetLang}`.
 */
export async function getCachedTranslations(
  articleIds: string[],
  targetLang: Lang
): Promise<Map<string, TranslatedFields>> {
  const out = new Map<string, TranslatedFields>();
  if (articleIds.length === 0) return out;
  const dbOk = (await connectDB()) !== null;
  if (!dbOk) return out;
  try {
    const docs = await TranslationModel.find({
      articleId: { $in: articleIds },
      targetLang,
    })
      .select({ articleId: 1, title: 1, summary: 1, _id: 0 })
      .lean<{ articleId: string; title: string; summary: string }[]>();
    for (const d of docs) {
      out.set(`${d.articleId}|${targetLang}`, { title: d.title, summary: d.summary });
    }
  } catch (err) {
    console.error("[translation] bulk cache fetch failed:", err);
  }
  return out;
}
