/**
 * Scheduled push notification endpoint
 * Called by server cron jobs for morning digest, evening brief, and breaking news
 *
 * POST /api/push/scheduled
 * Body: { type: "morning" | "personal" | "evening" | "breaking" | "daily",
 *         secret: string, language?: "ne" | "en" }
 *
 * "personal" is the default rhythm — a topic-titled story targeted by interest.
 * "breaking" is the exception, rate-limited so the 🚨 label keeps its meaning.
 */
import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";
import { store } from "@/lib/store";
import { personalTitle, breakingTitle, digestTitle } from "@/lib/push-titles";
import type { NewsArticle, TopicId } from "@/types";

const CRON_SECRET = process.env.CRON_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-cron-secret");

// Remember breaking stories already pushed, so the 15-min cron doesn't re-send
// the same article while it's still inside the 30-min freshness window.
// (In-memory; resets on restart — acceptable for time-sensitive alerts.)
const sentBreakingIds = new Set<string>();
// Same idea for personalised sends, so consecutive runs don't repeat a story.
const sentPersonalIds = new Set<string>();

// Breaking is now RARE by construction. Previously the only scheduled job was
// type=breaking every 15 min, and it hardcoded the siren title — so every
// notification a user ever saw screamed BREAKING, for routine stories. Real
// breaking events are uncommon (the cross-source detector needs 3+ outlets
// inside 90 min), so we additionally rate-limit the channel.
const BREAKING_COOLDOWN_MS = 3 * 3600_000; // 3h between breaking sends
const lastBreakingAt: Record<string, number> = {};

// Seed/mock articles ship in the in-memory store (store.ts starts from
// SEED_ARTICLES) and carry hand-written viewCounts in the thousands plus
// publishedAt values computed relative to process start. Real fetched articles
// have no viewCount at all — so after every restart the mocks look like the
// hottest stories in the pool and would be blasted to the entire user base
// ("Nepal Cricket Team Qualifies for ICC World Cup 2025"). Never notify on them.
function isRealArticle(a: NewsArticle): boolean {
  return !a.id.startsWith("mock-");
}

/** Freshness + source quality. Deliberately ignores viewCount — only the seed
 *  articles have one, so including it would just re-privilege the mocks. */
function storyScore(a: NewsArticle): number {
  const ageH = (Date.now() - new Date(a.publishedAt).getTime()) / 3600_000;
  return Math.max(0, 24 - ageH) * 2 + (a.sourceQuality ?? 6) * 3;
}

/** Recent, real, decent-quality stories, best first. */
function candidatePool(lang: "ne" | "en", hours = 8): NewsArticle[] {
  const cutoff = Date.now() - hours * 3600_000;
  return store
    .getArticles(lang)
    .filter(isRealArticle)
    .filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
    .sort((x, y) => storyScore(y) - storyScore(x));
}

export async function POST(req: NextRequest) {
  try {
    const { type, secret, language } = await req.json();

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lang = (language as "ne" | "en") ?? "ne";

    if (type === "morning") {
      // Morning digest — best recent real story (mocks excluded).
      const headline = candidatePool(lang, 16)[0];
      const title = digestTitle("morning", lang);
      const body = headline
        ? headline.title
        : (lang === "ne" ? "InShorts Nepal मा आजका ताजा समाचार पढ्नुहोस्।" : "Read today's fresh news on InShorts Nepal.");

      const result = await pushManager.sendToSubscribers(
        {
          title, body,
          url: headline ? `/news/${headline.id}` : "/",
          tag: "morning-digest",
          icon: "/icons/icon-192.png",
          articleId: headline?.id,
          sourceUrl: headline?.sourceUrl,
          language: lang,
        },
        { filter: { language: lang }, isBreaking: false }
      );
      return NextResponse.json({ success: true, type: "morning", ...result });
    }

    if (type === "evening") {
      const headline = candidatePool(lang, 12)[0];
      const title = digestTitle("evening", lang);
      const body = headline
        ? headline.title
        : (lang === "ne" ? "आजका महत्वपूर्ण घटनाहरू हेर्नुहोस्।" : "Catch up on today's important events.");

      const result = await pushManager.sendToSubscribers(
        {
          title, body,
          url: headline ? `/news/${headline.id}` : "/",
          tag: "evening-brief",
          icon: "/icons/icon-192.png",
          articleId: headline?.id,
          sourceUrl: headline?.sourceUrl,
          language: lang,
        },
        { filter: { language: lang } }
      );
      return NextResponse.json({ success: true, type: "evening", ...result });
    }

    // ── Personalised top story ────────────────────────────────────────────
    // The default rhythm. Picks the best recent REAL story and titles it by its
    // topic ("🏆 खेलकुद", "🏛️ राजनीति") rather than the breaking siren, and
    // targets subscribers whose interests match — with no-topic subscribers
    // included so people who never personalised still get relevant news.
    if (type === "personal") {
      const pool = candidatePool(lang).filter((a) => !sentPersonalIds.has(a.id));
      if (pool.length === 0) {
        return NextResponse.json({ success: true, type: "personal", sent: 0, message: "No fresh stories" });
      }

      const article = pool[0];
      sentPersonalIds.add(article.id);
      if (sentPersonalIds.size > 500) {
        sentPersonalIds.delete(sentPersonalIds.values().next().value as string);
      }

      const articleTopics = (article.topics ?? []) as TopicId[];
      const result = await pushManager.sendToSubscribers(
        {
          title: personalTitle(articleTopics[0], lang),
          body: article.title,
          url: `/news/${article.id}`,
          tag: `story-${article.id}`,
          icon: "/icons/icon-192.png",
          articleId: article.id,
          sourceUrl: article.sourceUrl,
          language: lang,
        },
        {
          filter: {
            language: lang,
            topics: articleTopics.length > 0 ? articleTopics : undefined,
            includeNoTopics: articleTopics.length > 0,
          },
          isBreaking: false,          // counts against the daily cap, unlike breaking
          articleTopics,
          // behaviorRelevanceScore() returns a neutral 50 for subscribers we
          // have no scores for (which is most of them, since scores are
          // in-memory and reset on restart). Anything above 50 here would
          // silently exclude everyone — that is exactly why the pre-existing
          // sendTopStoryAlert(minBehaviorScore: 55) would have sent to nobody.
          minBehaviorScore: 40,
        }
      );
      return NextResponse.json({ success: true, type: "personal", article: article.id, ...result });
    }

    if (type === "breaking") {
      // Rate-limit the siren so it stays meaningful.
      const since = Date.now() - (lastBreakingAt[lang] ?? 0);
      if (since < BREAKING_COOLDOWN_MS) {
        return NextResponse.json({
          success: true, type: "breaking", sent: 0,
          message: `Cooldown: ${Math.round((BREAKING_COOLDOWN_MS - since) / 60000)}m remaining`,
        });
      }

      // Find breaking articles published in last 30 minutes. Mocks excluded —
      // seed data is flagged and dated relative to process start, so it would
      // otherwise look "breaking" after every restart.
      const now = Date.now();
      const breakingArticles = store.getArticles(lang).filter(a =>
        a.isBreaking &&
        isRealArticle(a) &&
        (now - new Date(a.publishedAt).getTime()) < 30 * 60 * 1000
      );

      // Skip stories we've already alerted on within this freshness window.
      const fresh = breakingArticles.find((a) => !sentBreakingIds.has(a.id));
      if (!fresh) {
        return NextResponse.json({ success: true, type: "breaking", sent: 0, message: "No new breaking news" });
      }

      const article = fresh;
      sentBreakingIds.add(article.id);
      lastBreakingAt[lang] = Date.now();
      // Keep the set from growing unbounded over a long uptime.
      if (sentBreakingIds.size > 500) {
        sentBreakingIds.delete(sentBreakingIds.values().next().value as string);
      }
      const title = breakingTitle(lang);
      const articleTopics = (article.topics ?? []) as TopicId[];
      const result = await pushManager.sendToSubscribers(
        {
          title,
          body: article.title,
          url: `/news/${article.id}`,
          tag: `breaking-${article.id}`,
          icon: "/icons/icon-192.png",
          articleId: article.id,
          sourceUrl: article.sourceUrl,
          language: lang,
        },
        {
          // Filter: subscribers whose topics overlap the article's topics,
          // PLUS subscribers with no topics set (general audience — they should
          // still receive breaking news even if they haven't personalized yet).
          filter: {
            language: lang,
            topics: articleTopics.length > 0 ? articleTopics : undefined,
            includeNoTopics: articleTopics.length > 0,
          },
          isBreaking: true,
          articleTopics,            // used for behavior-score ranking
          minBehaviorScore: 0,      // breaking always sends regardless of score
        }
      );
      return NextResponse.json({ success: true, type: "breaking", article: article.id, ...result });
    }

    if (type === "daily") {
      // Daily fresh news digest — top article from last 24h
      const articles = store.getArticles(lang)
        .filter(a => Date.now() - new Date(a.publishedAt).getTime() < 24 * 60 * 60 * 1000)
        .slice(0, 1);
      const article = articles[0];
      const title = lang === "ne" ? "📰 आजका ताजा समाचार" : "📰 Today's Fresh News";
      const body = article
        ? article.title
        : (lang === "ne" ? "InShorts Nepal मा नयाँ समाचार उपलब्ध छ।" : "New news available on InShorts Nepal.");

      const result = await pushManager.sendToSubscribers(
        { title, body, url: "/", tag: "daily-digest", icon: "/icons/icon-192.png" },
        { filter: {} }
      );
      return NextResponse.json({ success: true, type: "daily", ...result });
    }

    return NextResponse.json(
      { error: "Invalid type. Use: morning | personal | evening | breaking | daily" },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
