// Wave 2 — Server-side behavior engine. Pure functions over a profile object.
// Mirrors the scoring of the mobile lib/behavior.ts so we get identical
// learning regardless of where it runs. Storage lives in user-behavior-store.ts.

const NEUTRAL = 50;
const DECAY_HALF_LIFE_DAYS = 14;
const SEEN_CAP = 400;
const DEPTHS_CAP = 10;

export type Daypart = "morning" | "afternoon" | "evening" | "night";

interface Affinity { score: number; ts: number; n: number }

export interface BehaviorProfile {
  topics: Record<string, Affinity>;
  sources: Record<string, number>;
  dayparts: Record<Daypart, Record<string, number>>;
  language: { ne: number; en: number };
  signals: {
    reads: number; skips: number; saves: number; shares: number;
    clicks: number; reopens: number; dwellMs: number; dwellCount: number;
  };
  seenArticleIds: string[];
  recentDepths: number[];
  totalRead: number;
  totalSkips: number;
  mutedSources: string[];
  hiddenTopics: string[];
}

export function defaultProfile(): BehaviorProfile {
  return {
    topics: {},
    sources: {},
    dayparts: { morning: {}, afternoon: {}, evening: {}, night: {} },
    language: { ne: 0, en: 0 },
    signals: { reads: 0, skips: 0, saves: 0, shares: 0, clicks: 0, reopens: 0, dwellMs: 0, dwellCount: 0 },
    seenArticleIds: [],
    recentDepths: [],
    totalRead: 0,
    totalSkips: 0,
    mutedSources: [],
    hiddenTopics: [],
  };
}

// ── Time helpers ─────────────────────────────────────────────────────────────
export function currentDaypart(d = new Date()): Daypart {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

// ── Decay ────────────────────────────────────────────────────────────────────
function decayedScore(a: Affinity, now: number): number {
  const days = (now - a.ts) / 86_400_000;
  const factor = Math.pow(0.5, days / DECAY_HALF_LIFE_DAYS);
  return NEUTRAL + (a.score - NEUTRAL) * factor;
}

/** Current decayed topic score (0..100), 50 if unknown. */
export function topicScore(profile: BehaviorProfile, topic: string, now = Date.now()): number {
  const a = profile.topics[topic];
  return a ? decayedScore(a, now) : NEUTRAL;
}

function bumpTopic(topics: Record<string, Affinity>, topic: string, delta: number, now: number) {
  const cur = topics[topic];
  const base = cur ? decayedScore(cur, now) : NEUTRAL;
  topics[topic] = { score: Math.max(0, Math.min(100, base + delta)), ts: now, n: (cur?.n ?? 0) + 1 };
}

// ── Signals ──────────────────────────────────────────────────────────────────
export interface SignalEvent {
  articleId: string;
  type:
    | "read" | "skip" | "save" | "share" | "click" | "dwell"
    | "more" | "less" | "hide_topic" | "mute_source"
    | "session_depth";
  topics?: string[];
  sourceName?: string;
  language?: "ne" | "en";
  dwellMs?: number;
  depth?: number;
  ts?: number;
}

// Scoring deltas — same values as mobile lib/behavior.ts, plus explicit
// feedback signals reserved for Wave 3 UI.
const SIGNAL_DELTA: Record<string, number> = {
  read: 6, skip: -8, save: 18, share: 25, click: 14, reopen: 16,
  more: 22, less: -22,
};

/**
 * Apply a single signal event to a profile (mutates the passed-in profile).
 * Caller is expected to clone before passing if the original must be preserved.
 */
export function applySignal(profile: BehaviorProfile, ev: SignalEvent): BehaviorProfile {
  const p = profile;
  const now = ev.ts ?? Date.now();
  const dp = currentDaypart(new Date(now));
  const topics = ev.topics ?? [];

  // ── Explicit feedback (Wave 3 wires UI; persistence ready now) ──
  if (ev.type === "hide_topic") {
    for (const t of topics) if (!p.hiddenTopics.includes(t)) p.hiddenTopics.push(t);
    return p;
  }
  if (ev.type === "mute_source" && ev.sourceName) {
    if (!p.mutedSources.includes(ev.sourceName)) p.mutedSources.push(ev.sourceName);
    return p;
  }

  // ── Session depth (used to infer "skim" vs "deep" intent) ──
  if (ev.type === "session_depth" && typeof ev.depth === "number") {
    p.recentDepths = [ev.depth, ...p.recentDepths].slice(0, DEPTHS_CAP);
    return p;
  }

  // ── Dwell stats only ──
  if (ev.type === "dwell") {
    if (typeof ev.dwellMs === "number") {
      p.signals.dwellMs += Math.min(ev.dwellMs, 120_000);
      p.signals.dwellCount += 1;
    }
    return p;
  }

  // Reopen detection (internal-only state, not part of SignalEvent's public union)
  let effective: string = ev.type;
  if (effective === "read" && p.seenArticleIds.includes(ev.articleId)) effective = "reopen";

  // Topic + daypart affinity
  const delta = SIGNAL_DELTA[effective] ?? 0;
  if (delta !== 0 && topics.length > 0) {
    for (const t of topics) {
      bumpTopic(p.topics, t, delta, now);
      p.dayparts[dp][t] = Math.max(0, Math.min(100, (p.dayparts[dp][t] ?? NEUTRAL) + delta * 0.6));
    }
  }

  // Source affinity for high-intent actions
  if ((ev.type === "click" || ev.type === "save" || ev.type === "share") && ev.sourceName) {
    p.sources[ev.sourceName] = (p.sources[ev.sourceName] ?? 0) + (ev.type === "click" ? 3 : 2);
  }

  // Language preference counter
  if (ev.language === "ne") p.language.ne += 1;
  else if (ev.language === "en") p.language.en += 1;

  // Aggregate counts
  if (effective === "reopen") p.signals.reopens += 1;
  if (ev.type === "read") p.signals.reads += 1;
  if (ev.type === "skip") p.signals.skips += 1;
  if (ev.type === "save") p.signals.saves += 1;
  if (ev.type === "share") p.signals.shares += 1;
  if (ev.type === "click") p.signals.clicks += 1;

  p.totalRead += effective === "skip" ? 0 : 1;
  p.totalSkips += effective === "skip" ? 1 : 0;

  // Remember seen (cap)
  if (!p.seenArticleIds.includes(ev.articleId)) {
    p.seenArticleIds = [ev.articleId, ...p.seenArticleIds].slice(0, SEEN_CAP);
  }

  return p;
}

// ── Intent inference (used by ranking) ───────────────────────────────────────
export type SessionIntent = "skim" | "deep" | "breaking" | "unknown";

export function likelyIntent(profile: BehaviorProfile): SessionIntent {
  const depths = profile.recentDepths;
  if (depths.length >= 3) {
    const avg = depths.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    if (avg > 0 && avg < 5) return "skim";
    if (avg >= 15) return "deep";
  }
  return "unknown";
}
