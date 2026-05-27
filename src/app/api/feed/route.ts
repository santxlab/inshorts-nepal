// Wave 2 — GET /api/feed
// Personalized, server-ranked feed for an anonymous deviceId.
//
//   GET /api/feed?lang=ne&page=1&limit=30&category=...&topic=...&region=...
//   Header: X-Device-Id: <uuid>
//
// Pipeline:
//   1. Pull approved articles (lang + category + topic filters).
//   2. Wave 1: language-aware 80/10/10 mix → soft cluster → min-floor.
//   3. Wave 2: load device's BehaviorProfile, run server-side rankFeed.
//   4. Paginate.
//
// Falls back to a default profile (neutral) when no deviceId is provided or
// the profile is empty — so first-launch users still get a sensible feed.
import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { buildMixedFeed, softCluster, enforceMinFloor } from "@/lib/feed-mixer";
import { loadProfile } from "@/lib/user-behavior-store";
import { defaultProfile, likelyIntent, SessionIntent } from "@/lib/behavior-server";
import { rankFeed, RankContext } from "@/lib/ranking-server";
import { getCachedTranslations } from "@/lib/translation-service";
import { TopicId, Category, NewsArticle } from "@/types";

const MIN_FEED_FLOOR = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = (searchParams.get("lang") || "ne") as "ne" | "en";
  const category = (searchParams.get("category") || "all") as Category;
  const topic = searchParams.get("topic") as TopicId | null;
  const region = searchParams.get("region") || undefined;
  const explicitIntent = searchParams.get("intent") as SessionIntent | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");

  const deviceId =
    req.headers.get("x-device-id") ||
    searchParams.get("deviceId") ||
    null;

  // ── 1. Candidate articles ──
  // Native-language articles (no translation needed).
  const nativePool = store.getArticles(lang, category);

  // Phase 2.2: foreign-language IN/Global articles get pulled in too, but ONLY
  // if a cached translation already exists. (Misses are translated by the
  // background job after each fetch — by the time the user requests, hits exist.)
  const otherLang: "ne" | "en" = lang === "ne" ? "en" : "ne";
  const foreignPool = store
    .getArticles(otherLang, category)
    .filter((a) => a.origin === "in" || a.origin === "global");

  let translated: NewsArticle[] = [];
  if (foreignPool.length > 0) {
    const cache = await getCachedTranslations(
      foreignPool.map((a) => a.id),
      lang
    );
    translated = foreignPool
      .filter((a) => cache.has(`${a.id}|${lang}`))
      .map((a) => {
        const t = cache.get(`${a.id}|${lang}`)!;
        // Spread keeps origin/quality/topics/etc.; override only title+summary+language.
        return { ...a, title: t.title, summary: t.summary, language: lang };
      });
  }

  let all = [...nativePool, ...translated];

  if (topic) {
    const byTopic = all.filter((a) => a.topics?.includes(topic));
    all = byTopic.length >= 3 ? byTopic : all;
  }

  // ── 2. Wave 1: mix → cluster → floor ──
  const mixed = buildMixedFeed(all);
  const clustered = softCluster(mixed);
  const candidates = enforceMinFloor(clustered, mixed, MIN_FEED_FLOOR);

  // ── 3. Wave 2: personalize per deviceId ──
  const profile = deviceId ? await loadProfile(deviceId) : defaultProfile();
  const ctx: RankContext = {
    profile,
    intent: explicitIntent ?? likelyIntent(profile),
    region,
  };

  // If the profile is essentially empty (cold start) skip ranking — the Wave 1
  // mix/cluster is already a sensible default. This avoids the score being
  // dominated by the neutral 50 plus diversity shuffling first-launch users.
  const hasSignal = Object.keys(profile.topics).length > 0
    || profile.signals.reads > 0
    || profile.mutedSources.length > 0
    || profile.hiddenTopics.length > 0;
  const ranked = hasSignal ? rankFeed(candidates, ctx) : candidates;

  // ── 4. Paginate ──
  const start = (page - 1) * limit;
  const items = ranked.slice(start, start + limit);

  return NextResponse.json({
    articles: items,
    total: ranked.length,
    page,
    hasMore: start + limit < ranked.length,
    personalized: hasSignal,
    translatedInThisPage: items.filter((a) => translated.some((t) => t.id === a.id)).length,
  });
}
