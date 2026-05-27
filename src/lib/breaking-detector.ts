// Wave 3 — Cross-source breaking news detector.
//
// The simple keyword detector in rss-fetcher only flags articles whose own
// title says "breaking/urgent/etc.". Real breaking news is better detected by
// *velocity across sources*: when 3+ outlets publish a similar story within a
// short window, it's almost certainly a real event.
//
// This runs after each cron fetch and mutates the in-store article objects'
// `isBreaking` flag so both the news/feed APIs and the scheduled breaking-push
// cron pick it up.
import type { NewsArticle } from "@/types";

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

// Tunables — chosen so detection is *conservative* (rather miss than spam).
const WINDOW_MS = 90 * 60 * 1000;         // articles must publish within 90 min of "now"
const SIMILARITY_THRESHOLD = 0.5;          // looser than dedup (0.7) since same event is told differently
const MIN_DISTINCT_SOURCES = 3;            // require ≥3 outlets covering it
const MIN_TOKENS = 6;                       // skip short / title-only items
const MIN_TOTAL_QUALITY = 18;               // sum of source-quality ≥ 18 (e.g. 6+6+6 or 9+9)

interface Cluster {
  lead: NewsArticle;            // freshest article in the cluster
  members: NewsArticle[];
  sources: Set<string>;
  tokens: Set<string>;
  publishedMs: number;
  qualitySum: number;
}

/**
 * Scan recent articles for cross-source clusters and flag the freshest member
 * of each qualifying cluster as `isBreaking`. Returns the count of newly-flagged
 * articles for logging.
 */
export function detectCrossSourceBreaking(articles: NewsArticle[], now = Date.now()): number {
  const recent = articles.filter(
    (a) => now - new Date(a.publishedAt).getTime() <= WINDOW_MS
  );

  const clusters: Cluster[] = [];
  for (const a of recent) {
    const tokens = tokenize(`${a.title} ${a.summary}`);
    if (tokens.size < MIN_TOKENS) continue;
    const publishedMs = new Date(a.publishedAt).getTime();
    const quality = a.sourceQuality ?? 6;

    let matched = false;
    for (const c of clusters) {
      if (jaccard(tokens, c.tokens) >= SIMILARITY_THRESHOLD) {
        c.members.push(a);
        c.sources.add(a.sourceName);
        c.qualitySum += quality;
        if (publishedMs > c.publishedMs) {
          c.lead = a;
          c.publishedMs = publishedMs;
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.push({
        lead: a,
        members: [a],
        sources: new Set([a.sourceName]),
        tokens,
        publishedMs,
        qualitySum: quality,
      });
    }
  }

  let flagged = 0;
  for (const c of clusters) {
    if (c.sources.size >= MIN_DISTINCT_SOURCES && c.qualitySum >= MIN_TOTAL_QUALITY) {
      if (!c.lead.isBreaking) {
        c.lead.isBreaking = true;
        flagged++;
      }
    }
  }
  return flagged;
}
