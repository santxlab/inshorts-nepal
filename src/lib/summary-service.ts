// Phase 2.2 — Short-form Inshorts-style summaries via the DigitalOcean Agent
// (DeepSeek V3.2). One summary per (articleId, lang, mode), cached in MongoDB
// and shared across all users → first user pays the cost, everyone else reads
// it free.
//   mode "short" → 30–40 words (in-app news card)
//   mode "long"  → 60–70 words (full story reader)
import type { NewsArticle } from "@/types";
import { chat, isDoAgentConfigured } from "./do-agent-client";
import { connectDB } from "./db";
import { SummaryModel, type SummaryMode } from "@/models/SummaryModel";

export type Lang = "ne" | "en";

const WORDS: Record<SummaryMode, string> = {
  short: "30 to 40",
  long: "60 to 70",
};

function systemPrompt(lang: Lang, mode: SummaryMode): string {
  // The language rule is stated forcefully and first because the model has been
  // observed ignoring a softer "in TARGET_LANGUAGE" instruction and replying in
  // English for Nepali articles. summarizeArticle() additionally GUARDS the
  // output and refuses to cache a wrong-language result.
  const langRule =
    lang === "ne"
      ? `OUTPUT LANGUAGE: नेपाली (Nepali) in DEVANAGARI SCRIPT ONLY.
- Write EVERY sentence in Nepali. Do NOT reply in English.
- No Latin letters except unavoidable proper nouns/acronyms.
- No Hindi vocabulary or Hindi grammar. End each sentence with "।".`
      : `OUTPUT LANGUAGE: English ONLY.
- Write the entire summary in clear, neutral English. Do NOT reply in Nepali/Devanagari.`;

  return `You are a news summarizer for InShorts Nepal.

${langRule}

LENGTH: ${WORDS[mode]} words. Stay within this range.

STYLE:
- Lead with the most important fact (who, what, when, where), then brief context.
- Preserve all proper nouns, numbers, dates, currencies, and places exactly.
- Neutral, journalistic tone. No opinion, no emotive adjectives.
- Self-contained — readable on its own without the source.

OUTPUT: Return ONLY the summary paragraph. No preface, no "Summary:" label, no
markdown, no greetings. If the input is empty or nonsensical, return exactly: ERROR`;
}

function buildPrompt(article: NewsArticle, lang: Lang, mode: SummaryMode): string {
  return `TARGET_LANGUAGE: ${lang}
LENGTH: ${WORDS[mode]} words
TITLE: ${article.title}
BODY: ${article.summary}`;
}

// Devanagari unicode block.
const DEVANAGARI = /[ऀ-ॿ]/;

function devanagariRatio(s: string): number {
  const dev = (s.match(/[ऀ-ॿ]/g) || []).length;
  const letters = (s.match(/[ऀ-ॿ\p{L}]/gu) || []).length || 1;
  return dev / letters;
}

// Reject output that came back in the wrong language (the model occasionally
// ignores the instruction). ne must be mostly Devanagari; en must be mostly not.
function isRightLanguage(summary: string, lang: Lang): boolean {
  if (lang === "ne") return DEVANAGARI.test(summary) && devanagariRatio(summary) > 0.5;
  return devanagariRatio(summary) < 0.2;
}

/** Returns a cached summary or generates+caches a new one. Returns null on failure. */
export async function summarizeArticle(
  article: NewsArticle,
  lang: Lang,
  mode: SummaryMode = "long"
): Promise<string | null> {
  if (!isDoAgentConfigured()) return null;
  const dbOk = (await connectDB()) !== null;

  // Cache lookup
  if (dbOk) {
    try {
      const cached = await SummaryModel.findOne({ articleId: article.id, lang, mode })
        .lean<{ summary: string }>();
      if (cached) return cached.summary;
    } catch (err) {
      console.error("[summary] cache read failed:", err);
    }
  }

  // Generate (with one retry if the model replies in the wrong language).
  let summary: string | null = null;
  for (let attempt = 0; attempt < 2 && !summary; attempt++) {
    const sys = attempt === 0
      ? systemPrompt(lang, mode)
      : systemPrompt(lang, mode) +
        (lang === "ne"
          ? `\n\nREMINDER: तपाईंको जवाफ पूर्ण रूपमा नेपाली (देवनागरी) मा मात्र हुनुपर्छ।`
          : `\n\nREMINDER: Your entire answer MUST be in English.`);
    const result = await chat(sys, buildPrompt(article, lang, mode));
    if (!result) break;
    const text = result.content.trim();
    if (text === "ERROR" || !text) break;
    if (isRightLanguage(text, lang)) summary = text;
  }
  if (!summary) return null;

  // Cache (best-effort)
  if (dbOk) {
    try {
      await SummaryModel.findOneAndUpdate(
        { articleId: article.id, lang, mode },
        { articleId: article.id, lang, mode, summary, modelName: process.env.DO_AGENT_MODEL ?? "deepseek-v3.2" },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("[summary] cache write failed:", err);
    }
  }

  return summary;
}

/** Bulk-fetch cached summaries for many articles — used by /api/feed. */
export async function getCachedSummaries(
  articleIds: string[],
  lang: Lang,
  mode: SummaryMode = "short"
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (articleIds.length === 0) return out;
  const dbOk = (await connectDB()) !== null;
  if (!dbOk) return out;
  try {
    const docs = await SummaryModel.find({ articleId: { $in: articleIds }, lang, mode })
      .select({ articleId: 1, summary: 1, _id: 0 })
      .lean<{ articleId: string; summary: string }[]>();
    for (const d of docs) out.set(d.articleId, d.summary);
  } catch (err) {
    console.error("[summary] bulk cache fetch failed:", err);
  }
  return out;
}
