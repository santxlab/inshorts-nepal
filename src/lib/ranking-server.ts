// Wave 2 — Server-side feed ranking. Pure functions.
// Mirrors mobile lib/ranking.ts so behavior is identical and the mobile app
// can stay a thin client.
import type { NewsArticle } from "@/types";
import { BehaviorProfile, topicScore, currentDaypart, SessionIntent } from "./behavior-server";

// ── Lightweight keyword vectors ──────────────────────────────────────────────
const STOP = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","is","are","was",
  "were","be","has","have","had","this","that","from","by","as","it","its","will","said",
  "his","her","their","they","not","also","after","over","into","more","new","says","than",
  "नेपाल","छ","र","मा","को","का","की","हो","भएको","गरेको","लागि","भने","पनि","गर्ने","भन्ने","हुने",
]);

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length >= 3 && !STOP.has(raw)) out.add(raw);
  }
  return out;
}

// ── Region → keyword hints for hyperlocal boost ──────────────────────────────
const REGION_HINTS: Record<string, string[]> = {
  kathmandu:     ["kathmandu", "काठमाडौं", "valley", "उपत्यका"],
  madhesh:       ["madhesh", "मधेश", "terai", "तराई"],
  lumbini:       ["lumbini", "लुम्बिनी"],
  koshi:         ["koshi", "कोशी"],
  gandaki:       ["gandaki", "गण्डकी"],
  karnali:       ["karnali", "कर्णाली"],
  sudurpashchim: ["sudurpashchim", "सुदूरपश्चिम"],
};

export interface RankContext {
  profile: BehaviorProfile;
  intent: SessionIntent;
  region?: string;
  now?: number;
}

// ── Component scores ─────────────────────────────────────────────────────────
function affinity(a: NewsArticle, profile: BehaviorProfile, now: number): number {
  const topics = a.topics ?? [];
  if (!topics.length) return 50;
  return topics.reduce((acc, t) => acc + topicScore(profile, t, now), 0) / topics.length;
}

function daypartBoost(a: NewsArticle, profile: BehaviorProfile): number {
  const dp = currentDaypart();
  const map = profile.dayparts[dp] ?? {};
  const topics = a.topics ?? [];
  if (!topics.length) return 0;
  const avg = topics.reduce((acc, t) => acc + (map[t] ?? 50), 0) / topics.length;
  return (avg - 50) * 0.3; // ±15
}

function freshness(a: NewsArticle, now: number): number {
  const ageH = (now - new Date(a.publishedAt).getTime()) / 3600_000;
  if (ageH < 1) return 25;
  if (ageH < 3) return 18;
  if (ageH < 6) return 10;
  if (ageH < 12) return 5;
  if (ageH < 24) return 0;
  return -10;
}

function trending(a: NewsArticle): number {
  const v = a.viewCount ?? 0;
  return Math.min(15, Math.log10(v + 1) * 5);
}

function intentModifier(a: NewsArticle, intent: SessionIntent): number {
  const rt = a.readTimeSeconds ?? 45;
  switch (intent) {
    case "breaking": return a.isBreaking ? 30 : -5;
    case "skim":     return (a.isBreaking ? 8 : 0) + (rt <= 45 ? 6 : -4);
    case "deep":     return rt >= 75 ? 10 : 0;
    default:         return 0;
  }
}

function geoBoost(a: NewsArticle, region: string | undefined, tokens: Set<string>): number {
  if (!region || region === "nepal" || region === "international") return 0;
  const hints = REGION_HINTS[region];
  if (!hints) return 0;
  return hints.some((h) => tokens.has(h.toLowerCase())) ? 12 : 0;
}

interface Scored { article: NewsArticle; score: number; tokens: Set<string>; reasons: string[] }

function scoreArticle(a: NewsArticle, ctx: RankContext, tokens: Set<string>): Scored {
  const now = ctx.now ?? Date.now();
  const reasons: string[] = [];
  let score = 0;

  const aff = affinity(a, ctx.profile, now); score += aff;
  if (aff > 62) reasons.push("matches your interests");

  const dp = daypartBoost(a, ctx.profile); score += dp;
  if (dp > 6) reasons.push(`popular with you in the ${currentDaypart()}`);

  const fr = freshness(a, now); score += fr;
  if (fr >= 18) reasons.push("just published");

  const tr = trending(a); score += tr;
  if (tr > 10) reasons.push("trending now");

  if (a.isBreaking) { score += 18; reasons.push("breaking news"); }

  const srcAff = ctx.profile.sources[a.sourceName] ?? 0;
  if (srcAff > 4) { score += Math.min(10, srcAff); reasons.push(`from ${a.sourceName}, which you read`); }

  score += intentModifier(a, ctx.intent);

  const geo = geoBoost(a, ctx.region, tokens);
  if (geo > 0) { score += geo; reasons.push("local to your region"); }

  // Sink already-read stories to the bottom.
  if (ctx.profile.seenArticleIds.includes(a.id)) score -= 1000;

  return { article: a, score, tokens, reasons };
}

// ── Diversity: avoid 3 in a row from same topic/source ───────────────────────
function applyDiversity(items: Scored[]): Scored[] {
  const out: Scored[] = [];
  const pool = [...items];
  while (pool.length) {
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      const last2 = out.slice(-2);
      const t = cand.article.topics?.[0];
      const sameTopic = last2.filter((x) => x.article.topics?.[0] === t).length >= 2;
      const sameSrc = last2.filter((x) => x.article.sourceName === cand.article.sourceName).length >= 2;
      if (!sameTopic && !sameSrc) { idx = i; break; }
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// ── Exploration/exploitation mix (70/30) ─────────────────────────────────────
function mixExploration(ranked: Scored[], now: number): Scored[] {
  const EXPLORE_EVERY = 5;
  const exploitCut = Math.ceil(ranked.length * 0.7);
  const exploit = ranked.slice(0, exploitCut);
  const explore = ranked.slice(exploitCut).sort((a, b) =>
    (freshness(b.article, now) + trending(b.article)) - (freshness(a.article, now) + trending(a.article))
  );
  const out: Scored[] = [];
  let ei = 0;
  exploit.forEach((item, i) => {
    out.push(item);
    if ((i + 1) % EXPLORE_EVERY === 0 && ei < explore.length) out.push(explore[ei++]);
  });
  while (ei < explore.length) out.push(explore[ei++]);
  return out;
}

// ── Hard filters from explicit feedback ──────────────────────────────────────
function applyMutesAndHidden(articles: NewsArticle[], profile: BehaviorProfile): NewsArticle[] {
  if (profile.mutedSources.length === 0 && profile.hiddenTopics.length === 0) return articles;
  const muted = new Set(profile.mutedSources);
  const hidden = new Set(profile.hiddenTopics);
  return articles.filter((a) => {
    if (muted.has(a.sourceName)) return false;
    if (a.topics?.some((t) => hidden.has(t))) return false;
    return true;
  });
}

/** Main entry: ranked, diversified, explore-mixed feed for a given profile. */
export function rankFeed(articles: NewsArticle[], ctx: RankContext): NewsArticle[] {
  const now = ctx.now ?? Date.now();
  const filtered = applyMutesAndHidden(articles, ctx.profile);
  const scored = filtered.map((a) => scoreArticle(a, ctx, tokenize(`${a.title} ${a.summary}`)));
  scored.sort((a, b) => b.score - a.score);
  const mixed = mixExploration(scored, now);
  const diversified = applyDiversity(mixed);
  return diversified.map((s) => s.article);
}

/** "Why am I seeing this?" — human-readable ranking explanation. */
export function explainRanking(article: NewsArticle, ctx: RankContext): string[] {
  const tokens = tokenize(`${article.title} ${article.summary}`);
  const { reasons } = scoreArticle(article, ctx, tokens);
  return reasons.length ? reasons : ["fresh story we thought you'd like"];
}
