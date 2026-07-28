import { generateText } from "./text-ai";
import { WeeklyInsightModel, IWeeklyInsight } from "@/models/WeeklyInsightModel";
import { ArticleModel } from "@/models/ArticleModel";
import { connectDB } from "./db";
import { TOPICS } from "./topics-config";

// ── ISO week helper ─────────────────────────────────────────────────────────
export function getWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── Category picker ─────────────────────────────────────────────────────────
// Skip generic/ambiguous topics that don't make great weekly stories
const SKIP_CATEGORIES = new Set(["breaking", "government", "local", "weather"]);

async function pickCategory(): Promise<{ id: string; label: string; labelNe: string } | null> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows: { _id: string; count: number }[] = await ArticleModel.aggregate([
    { $match: { publishedAt: { $gte: since }, isApproved: true } },
    { $unwind: "$topics" },
    { $group: { _id: "$topics", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  for (const row of rows) {
    if (SKIP_CATEGORIES.has(row._id)) continue;
    const cfg = TOPICS.find((t) => t.id === row._id);
    if (!cfg) continue;
    return { id: cfg.id, label: cfg.label, labelNe: cfg.labelNe };
  }
  return null;
}

// ── AI generation ───────────────────────────────────────────────────────────
interface RawInsight {
  title: string;
  shareMessage: string;
  pages: { heading: string; body: string }[];
}

async function generateInsightContent(
  lang: "ne" | "en",
  category: { id: string; label: string; labelNe: string },
  articles: { title: string; summary: string }[],
  weekId: string,
): Promise<RawInsight | null> {
  const isNe = lang === "ne";
  const catLabel = isNe ? category.labelNe : category.label;
  const articleLines = articles
    .slice(0, 20)
    .map((a, i) => `${i + 1}. ${a.title}: ${a.summary}`)
    .join("\n");

  const systemPrompt = isNe
    ? `तपाईं एक समाचार विश्लेषक हुनुहुन्छ। सफा JSON मात्र आउटपुट गर्नुहोस्, कुनै markdown नहोस्।`
    : `You are a news analyst. Output clean JSON only, no markdown.`;

  const userPrompt = isNe
    ? `हप्ता: ${weekId}
विषय: ${catLabel}

यी समाचारहरूको आधारमा एउटा साप्ताहिक अन्तर्दृष्टि कथा बनाउनुहोस्।

समाचारहरू:
${articleLines}

यो JSON संरचना फर्काउनुहोस् (नेपालीमा):
{
  "title": "कथाको शीर्षक (१५ शब्दभित्र)",
  "shareMessage": "शेयर गर्न आकर्षक सन्देश — सञ्चार गर्ने जस्तो अनुहार emoji सहित (१ वाक्य)",
  "pages": [
    { "heading": "स्लाइड शीर्षक", "body": "२–३ वाक्य विश्लेषण" },
    { "heading": "...", "body": "..." },
    { "heading": "...", "body": "..." }
  ]
}
३–४ पेज राख्नुहोस्।`
    : `Week: ${weekId}
Topic: ${catLabel}

Based on these news articles, create a weekly insight story.

Articles:
${articleLines}

Return this JSON structure (in English):
{
  "title": "Story title (under 15 words)",
  "shareMessage": "Engaging share caption with relevant emoji (1 sentence)",
  "pages": [
    { "heading": "Slide heading", "body": "2-3 sentence analysis" },
    { "heading": "...", "body": "..." },
    { "heading": "...", "body": "..." }
  ]
}
Include 3-4 pages.`;

  const result = await generateText(systemPrompt, userPrompt, { temperature: 0.5, maxTokens: 1200 });
  if (!result) return null;

  try {
    const jsonStr = result.content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const parsed = JSON.parse(jsonStr) as RawInsight;
    if (!parsed.title || !Array.isArray(parsed.pages) || parsed.pages.length < 2) return null;
    return parsed;
  } catch {
    console.error("[weekly-insight] JSON parse failed:", result.content.slice(0, 200));
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current week's insight for `lang`, generating it on first call.
 * Idempotent: subsequent calls return the cached document.
 */
export async function getOrGenerateInsight(
  lang: "ne" | "en" = "en",
): Promise<IWeeklyInsight | null> {
  await connectDB();

  const weekId = getWeekId();

  // Return cached if exists
  const cached = await WeeklyInsightModel.findOne({ weekId, lang });
  if (cached) return cached;

  // Pick hottest category this week
  const category = await pickCategory();
  if (!category) {
    console.warn("[weekly-insight] no category found, skipping generation");
    return null;
  }

  // Fetch top articles for that category (past 7 days)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const articles = await ArticleModel.find({
    topics: category.id,
    publishedAt: { $gte: since },
    isApproved: true,
  })
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();

  if (articles.length < 3) {
    console.warn(`[weekly-insight] too few articles for category ${category.id}`);
    return null;
  }

  // Generate via AI
  const raw = await generateInsightContent(lang, category, articles as { title: string; summary: string }[], weekId);
  if (!raw) return null;

  // Attach images from source articles
  const pages = raw.pages.map((p, i) => ({
    heading: p.heading,
    body: p.body,
    imageUrl: (articles[i] as { imageUrl?: string })?.imageUrl ?? undefined,
  }));

  try {
    const doc = await WeeklyInsightModel.create({
      weekId,
      lang,
      category: category.id,
      categoryLabel: lang === "ne" ? category.labelNe : category.label,
      title: raw.title,
      shareMessage: raw.shareMessage,
      pages,
      articleIds: articles.map((a) => (a as { articleId: string }).articleId),
    });
    return doc;
  } catch (err: unknown) {
    // Race condition: another request already inserted it
    if ((err as { code?: number }).code === 11000) {
      return WeeklyInsightModel.findOne({ weekId, lang });
    }
    throw err;
  }
}
