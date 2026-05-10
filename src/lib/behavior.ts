// AI-powered reading behavior personalization engine
// Tracks implicit signals to weight topic scores and reorder the feed

import { TopicId } from "@/types";

export interface ArticleSignal {
  articleId: string;
  topics: TopicId[];
  language: string;
  timestamp: number;
  // signals
  readPercent: number;    // 0-100: how far they scrolled through the article
  timeSpentMs: number;    // milliseconds on article
  liked: boolean;
  saved: boolean;
  shared: boolean;
  skipped: boolean;       // swiped away quickly
  audioListened: boolean;
  languageSwitched: boolean;
}

export interface TopicScore {
  topic: TopicId;
  score: number;          // 0-100, higher = more preferred
  interactions: number;   // raw count
}

export interface BehaviorProfile {
  signals: ArticleSignal[];    // last 200 signals, circular
  topicScores: Record<TopicId, number>;
  preferredLanguage: string | null;
  avgReadTimeMs: number;
  totalArticlesRead: number;
  totalSkips: number;
  lastUpdated: number;
}

const DEFAULT_PROFILE: BehaviorProfile = {
  signals: [],
  topicScores: {} as Record<TopicId, number>,
  preferredLanguage: null,
  avgReadTimeMs: 0,
  totalArticlesRead: 0,
  totalSkips: 0,
  lastUpdated: Date.now(),
};

const BEHAVIOR_KEY = "inshorts-nepal-behavior";
const MAX_SIGNALS = 200;

// Signal weights for scoring
const WEIGHTS = {
  fullRead: 15,       // readPercent >= 80
  partialRead: 5,     // readPercent 30-79
  liked: 20,
  saved: 18,
  shared: 25,
  audioListened: 12,
  skipped: -8,
  quickSkip: -15,    // timeSpentMs < 3000 AND readPercent < 20
  languageSwitched: -3,
};

// Decay factor per day (recent signals count more)
const DECAY_PER_DAY = 0.92;

function decayedWeight(signal: ArticleSignal, now: number): number {
  const ageMs = now - signal.timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(DECAY_PER_DAY, ageDays);
}

function signalWeight(signal: ArticleSignal): number {
  let w = 0;
  if (signal.readPercent >= 80) w += WEIGHTS.fullRead;
  else if (signal.readPercent >= 30) w += WEIGHTS.partialRead;
  if (signal.liked) w += WEIGHTS.liked;
  if (signal.saved) w += WEIGHTS.saved;
  if (signal.shared) w += WEIGHTS.shared;
  if (signal.audioListened) w += WEIGHTS.audioListened;
  if (signal.skipped) {
    w += (signal.timeSpentMs < 3000 && signal.readPercent < 20)
      ? WEIGHTS.quickSkip
      : WEIGHTS.skipped;
  }
  if (signal.languageSwitched) w += WEIGHTS.languageSwitched;
  return w;
}

export function computeTopicScores(signals: ArticleSignal[]): Record<TopicId, number> {
  const now = Date.now();
  const raw: Partial<Record<TopicId, number>> = {};

  for (const signal of signals) {
    const weight = signalWeight(signal) * decayedWeight(signal, now);
    for (const topic of signal.topics) {
      raw[topic] = (raw[topic] ?? 50) + weight; // start at neutral 50
    }
  }

  // Normalize to 0-100
  const scores: Record<TopicId, number> = {} as Record<TopicId, number>;
  for (const [topic, rawScore] of Object.entries(raw)) {
    scores[topic as TopicId] = Math.max(0, Math.min(100, rawScore ?? 50));
  }
  return scores;
}

export function loadBehaviorProfile(): BehaviorProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PROFILE;
}

export function saveBehaviorProfile(profile: BehaviorProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

export function recordSignal(
  profile: BehaviorProfile,
  signal: ArticleSignal
): BehaviorProfile {
  const signals = [...profile.signals, signal].slice(-MAX_SIGNALS);
  const topicScores = computeTopicScores(signals);

  const totalRead = profile.totalArticlesRead + (signal.skipped ? 0 : 1);
  const totalSkips = profile.totalSkips + (signal.skipped ? 1 : 0);

  // Rolling average read time
  const newAvg = signal.skipped
    ? profile.avgReadTimeMs
    : (profile.avgReadTimeMs * profile.totalArticlesRead + signal.timeSpentMs) /
      Math.max(1, totalRead);

  return {
    signals,
    topicScores,
    preferredLanguage: signal.languageSwitched
      ? profile.preferredLanguage
      : signal.language,
    avgReadTimeMs: newAvg,
    totalArticlesRead: totalRead,
    totalSkips,
    lastUpdated: Date.now(),
  };
}

// Sort articles by personalization score for a given profile
export function personalizeOrder<T extends { topics?: TopicId[]; publishedAt: string }>(
  articles: T[],
  profile: BehaviorProfile
): T[] {
  if (Object.keys(profile.topicScores).length === 0) return articles; // no data yet

  return [...articles].sort((a, b) => {
    const scoreA = articlePersonalizationScore(a.topics ?? [], a.publishedAt, profile);
    const scoreB = articlePersonalizationScore(b.topics ?? [], b.publishedAt, profile);
    return scoreB - scoreA;
  });
}

function articlePersonalizationScore(
  topics: TopicId[],
  publishedAt: string,
  profile: BehaviorProfile
): number {
  // Average topic score
  let topicScore = 50;
  if (topics.length > 0) {
    const sum = topics.reduce((acc, t) => acc + (profile.topicScores[t] ?? 50), 0);
    topicScore = sum / topics.length;
  }

  // Recency bonus (articles published within last 2 hours get +20)
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const recencyBonus = ageMs < 2 * 60 * 60 * 1000 ? 20 : ageMs < 6 * 60 * 60 * 1000 ? 10 : 0;

  return topicScore + recencyBonus;
}

// Helper: create a new signal (used in components)
export function createSignal(
  articleId: string,
  topics: TopicId[],
  language: string,
  overrides: Partial<ArticleSignal> = {}
): ArticleSignal {
  return {
    articleId,
    topics,
    language,
    timestamp: Date.now(),
    readPercent: 0,
    timeSpentMs: 0,
    liked: false,
    saved: false,
    shared: false,
    skipped: false,
    audioListened: false,
    languageSwitched: false,
    ...overrides,
  };
}
