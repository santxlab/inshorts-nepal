// Wave 1 — Feed mixer
//
// Three responsibilities, applied in order at API request time:
//
//   1. buildMixedFeed   — interleave articles 80% np · 10% in · 10% global per
//                          chunk of 10 (degrades gracefully when a pool is sparse).
//   2. softCluster      — collapse near-duplicate stories (Jaccard ≥ 0.7 within
//                          a 24h publish window), keeping the best representative.
//   3. enforceMinFloor  — if clustering shrinks the feed below the target, fall
//                          back to the pre-clustered set so the user never sees
//                          an empty feed.

import type { NewsArticle } from "@/types";

// ── Lightweight token vectors ────────────────────────────────────────────────
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

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// ── 80/10/10 language-aware origin mix ───────────────────────────────────────
type Origin = "np" | "in" | "global";

function originOf(a: NewsArticle): Origin {
  return (a.origin ?? "np") as Origin;
}

/**
 * Interleave by chunks of 10: 8 np · 1 in · 1 global · repeat.
 * Each pool stays in its own publish-time order. When the np pool runs out we
 * keep emitting the rest (in + global) so the response is never truncated.
 */
export function buildMixedFeed(articles: NewsArticle[]): NewsArticle[] {
  const np: NewsArticle[] = [];
  const in_: NewsArticle[] = [];
  const global: NewsArticle[] = [];
  for (const a of articles) {
    const o = originOf(a);
    if (o === "in") in_.push(a);
    else if (o === "global") global.push(a);
    else np.push(a);
  }

  const out: NewsArticle[] = [];
  let i = 0, j = 0, k = 0;
  while (i < np.length || j < in_.length || k < global.length) {
    // 8 from np
    for (let n = 0; n < 8 && i < np.length; n++) out.push(np[i++]);
    // 1 from in
    if (j < in_.length) out.push(in_[j++]);
    // 1 from global
    if (k < global.length) out.push(global[k++]);
    // If np exhausted, flush the rest and stop (no useful interleaving left)
    if (i >= np.length) {
      while (j < in_.length) out.push(in_[j++]);
      while (k < global.length) out.push(global[k++]);
      break;
    }
  }
  return out;
}

// ── Soft duplicate clustering ────────────────────────────────────────────────
const CLUSTER_THRESHOLD = 0.7;       // Jaccard above this = same story
const CLUSTER_WINDOW_MS = 24 * 3600 * 1000;
const MIN_TOKENS = 6;                // skip clustering on very short text (titles only)

interface Cluster {
  lead: NewsArticle;
  tokens: Set<string>;
  publishedMs: number;
  quality: number;
}

/**
 * Collapse near-identical stories. Keeps the first occurrence (which, since the
 * input is sorted newest-first, is the freshest) as the cluster representative.
 * If a later article matches an existing cluster and has higher source quality,
 * we promote it to the representative.
 */
export function softCluster(articles: NewsArticle[]): NewsArticle[] {
  const clusters: Cluster[] = [];
  const out: NewsArticle[] = [];

  for (const a of articles) {
    const tokens = tokenize(`${a.title} ${a.summary}`);
    if (tokens.size < MIN_TOKENS) {
      // Too short to safely cluster — pass through.
      out.push(a);
      continue;
    }
    const publishedMs = new Date(a.publishedAt).getTime();
    const aQuality = a.sourceQuality ?? 6;

    let matchedIndex = -1;
    for (let i = clusters.length - 1; i >= 0; i--) {
      const c = clusters[i];
      // Stop scanning when we go out of the time window (clusters were added in
      // publish order, so older ones come first).
      if (publishedMs - c.publishedMs > CLUSTER_WINDOW_MS) continue;
      if (jaccard(tokens, c.tokens) >= CLUSTER_THRESHOLD) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      clusters.push({ lead: a, tokens, publishedMs, quality: aQuality });
      out.push(a);
    } else {
      // Already represented — promote if this candidate is meaningfully higher quality.
      const c = clusters[matchedIndex];
      if (aQuality > c.quality + 1) {
        // Replace the lead in the output list with the higher-quality version.
        const idx = out.lastIndexOf(c.lead);
        if (idx !== -1) out[idx] = a;
        c.lead = a;
        c.quality = aQuality;
        c.publishedMs = publishedMs;
        c.tokens = tokens;
      }
    }
  }

  return out;
}

// ── Min-feed floor ───────────────────────────────────────────────────────────
/**
 * Never let the user see a near-empty feed. If clustering shrinks the result
 * below `target`, return the pre-clustered set so they still get a full screen
 * of stories. Source diversity is preserved because the pre-clustered set keeps
 * everything.
 */
export function enforceMinFloor<T>(clustered: T[], original: T[], target = 20): T[] {
  return clustered.length >= target ? clustered : original;
}
