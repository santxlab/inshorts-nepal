import Parser from "rss-parser";
import { createHash } from "crypto";
import { NewsArticle, NewsSource, Category, Language } from "@/types";
import { store } from "./store";
import { detectTopics } from "./topics-config";
import { detectCrossSourceBreaking } from "./breaking-detector";
import { translateBatch } from "./translation-service";
import { isOpenAIConfigured } from "./openai-client";

// Drop items older than this — keeps stale/mis-dated feed entries out of the feed.
const MAX_AGE_DAYS = 21;

// ─── IndexNow: instant URL submission to Google / Bing ───────────────────────
async function submitToIndexNow(articleIds: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3005";
  if (!key || articleIds.length === 0) return;

  try {
    const hostname = new URL(baseUrl).hostname;
    const urlList = articleIds.map((id) => `${baseUrl}/news/${id}`).slice(0, 10000);

    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: hostname, key, urlList }),
    });
  } catch {
    // Non-fatal — indexing will catch up via sitemap
  }
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 Nepal-InShort-App/1.0",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
      ["image", "imageTag"],
    ],
  },
});

// Conservative breaking-news detector: a strong keyword AND very fresh, so the
// 15-min "breaking" push only fires for genuine, time-sensitive stories.
const BREAKING_RX = /breaking news|breaking:|\bjust in\b|\burgent\b|developing story|ब्रेकिङ|तत्काल समाचार|तत्कालै/i;
function detectBreaking(text: string, publishedMs: number, now: number): boolean {
  if (now - publishedMs > 2 * 3600 * 1000) return false; // only within ~2h of publish
  return BREAKING_RX.test(text);
}

function guessCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (/\b(sport|cricket|football|nfl|nba|खेल|क्रिकेट)\b/.test(lower))
    return "sports";
  if (/\b(tech|software|ai|digital|internet|app|प्रविधि)\b/.test(lower))
    return "technology";
  if (/\b(business|economy|stock|market|trade|बजार|अर्थ)\b/.test(lower))
    return "business";
  if (/\b(health|medical|hospital|covid|vaccine|स्वास्थ्य)\b/.test(lower))
    return "health";
  if (/\b(entertainment|film|movie|music|actor|मनोरञ्जन)\b/.test(lower))
    return "entertainment";
  if (/\b(world|international|global|विश्व|अन्तर्राष्ट्रिय)\b/.test(lower))
    return "world";
  if (/\b(education|school|university|student|शिक्षा)\b/.test(lower))
    return "education";
  if (
    /\b(politics|government|minister|election|राजनीति|सरकार|मन्त्री)\b/.test(
      lower
    )
  )
    return "politics";
  return "all";
}

// Named HTML entities commonly found in RSS summaries (typographic punctuation).
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  ndash: "–", mdash: "—", hellip: "…", trade: "™",
  copy: "©", reg: "®", deg: "°", middot: "·",
  laquo: "«", raquo: "»", times: "×", divide: "÷",
  rupee: "₹",
};

function decodeEntities(s: string): string {
  return s
    // numeric decimal: &#39; &#8217;
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    // numeric hex: &#x27; &#x2019;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // named: &rsquo; &ndash; etc.
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

// Windows-1252 quirks in 0x80–0x9F: these characters map back to a single byte
// that differs from their Unicode code point. Needed to correctly reverse
// mojibake — without it, e.g. "‡" (U+2021) would wrongly become "!" (0x21).
const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

// Repair classic UTF-8-decoded-as-cp1252 mojibake (e.g. "à¤¨à¥‡à¤ªà¤¾à¤²" → "नेपाल").
// Devanagari bytes start 0xE0 → "à"; Latin punctuation shows up as "Ã"/"Â".
// We only re-decode when those tell-tale sequences are present, so clean text is
// untouched, and we bail if any char isn't representable as a single byte.
function fixMojibake(s: string): string {
  if (!/[ÃÂ]|à[¤¥¦§¨©ª¬­®]/.test(s)) return s;
  const bytes: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xff) bytes.push(cp);
    else if (CP1252_REVERSE[cp] !== undefined) bytes.push(CP1252_REVERSE[cp]);
    else return s; // not a single-byte char → not this kind of mojibake; leave as-is
  }
  try {
    const repaired = Buffer.from(bytes).toString("utf8");
    if (!repaired.includes("�")) return repaired; // reject if it introduced U+FFFD
  } catch {
    /* fall through */
  }
  return s;
}

function stripHtml(html: string): string {
  return fixMojibake(decodeEntities(html.replace(/<[^>]*>/g, " ")))
    .replace(/\s+/g, " ")
    .trim();
}

type MediaNode = { $?: { url?: string; medium?: string; type?: string } } | undefined;

// Parser item enriched with the custom fields we registered above.
type FeedItem = Parser.Item & {
  mediaContent?: unknown;
  mediaThumbnail?: unknown;
  contentEncoded?: string;
  imageTag?: { url?: string } | string;
  "content:encoded"?: string;
};

function looksLikeImage(url: string | undefined): url is string {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  // Reject obvious non-images (tracking pixels are fine; videos/audio are not).
  return !/\.(mp4|mp3|m4a|webm|mov|avi|pdf)(\?|$)/i.test(url);
}

function firstMediaUrl(node: unknown): string | undefined {
  const arr = Array.isArray(node) ? node : node ? [node] : [];
  for (const m of arr as MediaNode[]) {
    const url = m?.$?.url;
    const medium = m?.$?.medium;
    const type = m?.$?.type;
    if (url && looksLikeImage(url) && (!medium || medium === "image") && (!type || type.startsWith("image"))) {
      return url;
    }
  }
  return undefined;
}

function extractImage(item: FeedItem): string | undefined {
  // 1. Enclosure (only when it's actually an image)
  const enc = item.enclosure;
  if (enc?.url && looksLikeImage(enc.url) && (!enc.type || enc.type.startsWith("image"))) {
    return enc.url;
  }
  // 2. media:content / media:thumbnail (may be arrays — pick the first image)
  const fromMediaContent = firstMediaUrl(item.mediaContent);
  if (fromMediaContent) return fromMediaContent;
  const fromThumb = firstMediaUrl(item.mediaThumbnail);
  if (fromThumb) return fromThumb;
  // 3. <image> tag with a url child
  const imageTag = item.imageTag as { url?: string } | string | undefined;
  if (typeof imageTag === "string" && looksLikeImage(imageTag)) return imageTag;
  if (imageTag && typeof imageTag === "object" && looksLikeImage(imageTag.url)) return imageTag.url;
  // 4. First <img> inside the article body / description
  const content =
    (item.contentEncoded as string) ||
    (item["content:encoded"] as string) ||
    item.content ||
    item.summary ||
    "";
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && looksLikeImage(match[1])) return match[1];
  return undefined;
}

// Stable, collision-free article id: hash the FULL canonical key.
// (The old `base64(link).slice(0,16)` only captured the first 12 bytes — the
// shared domain prefix — so every article from a source collapsed to one id.)
function makeArticleId(sourceId: string, key: string): string {
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 16);
  return `${sourceId}-${hash}`;
}

// Fetch raw bytes and decode as UTF-8 ourselves, then hand the string to the
// parser. This stops feeds with a missing/incorrect charset header from being
// mis-decoded into mojibake. Falls back to parser.parseURL on any failure.
async function loadFeed(source: NewsSource) {
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Nepal-InShort-App/1.0",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const text = new TextDecoder("utf-8").decode(buf);
    return await parser.parseString(text);
  } catch {
    return await parser.parseURL(source.url);
  }
}

export async function fetchFromSource(
  source: NewsSource
): Promise<NewsArticle[]> {
  try {
    const feed = await loadFeed(source);
    const articles: NewsArticle[] = [];
    const now = Date.now();
    const maxAgeMs = MAX_AGE_DAYS * 24 * 3600 * 1000;

    for (const item of feed.items.slice(0, 20)) {
      if (!item.title) continue;

      const fi = item as FeedItem;
      const rawSummary =
        fi.contentEncoded ||
        fi["content:encoded"] ||
        item.content ||
        item.summary ||
        item.contentSnippet ||
        "";

      const cleanSummary = stripHtml(rawSummary).slice(0, 300);
      const title = stripHtml(item.title);
      if (!title) continue;

      // Skip obvious test/placeholder posts that occasionally appear in feeds
      // (e.g. a "test video" item) — they look broken as the lead story.
      if (title.length <= 20 && /^(test|testing|demo|untitled|lorem|sample|asdf|xxx)\b/i.test(title)) {
        continue;
      }

      // Parse + validate the publish date; skip stale or implausible dates.
      const parsed = item.pubDate ? new Date(item.pubDate) : null;
      const validDate = parsed && !isNaN(parsed.getTime());
      const publishedMs = validDate ? parsed.getTime() : now;
      if (validDate) {
        const age = now - publishedMs;
        if (age > maxAgeMs) continue;            // too old (e.g. 953-day article)
        if (publishedMs > now + 24 * 3600 * 1000) continue; // future-dated junk
      }

      const category = guessCategory(title + " " + cleanSummary);
      const image = extractImage(fi);
      const detectedTopics = detectTopics(title + " " + cleanSummary);
      const isBreaking = detectBreaking(title + " " + cleanSummary, publishedMs, now);

      articles.push({
        id: makeArticleId(source.id, item.link || item.guid || title),
        title,
        summary: cleanSummary || title,
        imageUrl: image,
        sourceUrl: item.link || source.url,
        sourceName: source.name,
        category,
        topics: detectedTopics,
        ...(isBreaking ? { isBreaking: true } : {}),
        language: source.language,
        origin: source.origin ?? "np",          // Wave 1: language-aware feed mix
        sourceQuality: source.quality ?? 6,     // Wave 1: cluster representative tiebreak
        publishedAt: new Date(publishedMs).toISOString(),
        fetchedAt: new Date().toISOString(),
        isApproved: true,
        readTimeSeconds: Math.max(30, Math.floor(cleanSummary.split(" ").length * 0.4)),
      });
    }

    store.markFetched(source.id);
    return articles;
  } catch (err) {
    console.error(`Failed to fetch from ${source.name}:`, err);
    return [];
  }
}

export async function fetchAllSources(
  language?: Language
): Promise<{ added: number; sources: number }> {
  const sources = store
    .getSources()
    .filter((s) => s.isActive && (!language || s.language === language));

  let totalAdded = 0;
  let fetchedSources = 0;

  await Promise.allSettled(
    sources.map(async (source) => {
      if (!store.shouldFetch(source.id)) return;
      const articles = await fetchFromSource(source);
      if (articles.length > 0) {
        const added = store.addArticles(articles);
        totalAdded += added;
        fetchedSources++;
        store.updateSource(source.id, {
          lastFetched: new Date().toISOString(),
          articleCount: (source.articleCount || 0) + added,
        });
        // Submit new article URLs to IndexNow (Google + Bing instant indexing)
        if (added > 0) {
          const newIds = articles.slice(0, added).map((a) => a.id);
          submitToIndexNow(newIds).catch(() => {});
        }
      }
    })
  );

  // Wave 3: after every fetch run, scan the live article pool for cross-source
  // breaking clusters and flag the freshest representative as isBreaking. The
  // breaking-push cron + ranking both read this flag.
  try {
    const lang = language ?? undefined;
    const pool = lang ? store.getArticles(lang) : store.getAllArticles();
    const flagged = detectCrossSourceBreaking(pool);
    if (flagged > 0) console.log(`[breaking-detector] flagged ${flagged} cross-source breaking stories`);
  } catch (err) {
    console.error("[breaking-detector] failed:", err);
  }

  // Phase 2.2: kick off background AI translation of foreign-language articles
  // (origin in/global English ↔ Nepali users, etc.). Cache-hit short-circuits
  // mean only NEW articles actually hit OpenAI on each cycle.
  if (isOpenAIConfigured()) {
    // Fire and forget — must not block the fetch response.
    setImmediate(() => {
      const articles = store.getAllArticles().filter(
        (a) => a.origin === "in" || a.origin === "global"
      );
      translateBatch(articles, ["ne", "en"], 2)
        .then((r) => {
          if (r.succeeded > 0) {
            console.log(`[translation] new: ${r.succeeded} · cached: ${r.cached} · skipped(no-need): ${r.attempted - r.succeeded - r.cached}`);
          }
        })
        .catch((err) => console.error("[translation] batch failed:", err));
    });
  }

  return { added: totalAdded, sources: fetchedSources };
}

// Kept for reference — actual seed data is in store.ts
const _UNUSED_MOCK: NewsArticle[] = [
  {
    id: "mock-1",
    title: "Nepal Government Announces New Economic Policy for 2024",
    summary:
      "The Nepal government has unveiled a comprehensive economic policy aimed at boosting GDP growth by 7% in the upcoming fiscal year. The policy focuses on infrastructure development, tourism revival, and digital transformation.",
    imageUrl:
      "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=800&auto=format",
    sourceUrl: "https://kathmandupost.com",
    sourceName: "Kathmandu Post",
    category: "politics",
    language: "en",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-2",
    title: "Nepal Cricket Team Qualifies for ICC World Cup 2025",
    summary:
      "In a historic achievement, Nepal's national cricket team has secured its spot in the ICC Cricket World Cup 2025 after defeating Malaysia by 8 wickets. Captain Rohit Paudel led with a stunning 95-run innings.",
    imageUrl:
      "https://images.unsplash.com/photo-1540747913346-19212a4b3c55?w=800&auto=format",
    sourceUrl: "https://kathmandupost.com",
    sourceName: "Kathmandu Post",
    category: "sports",
    language: "en",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-3",
    title: "Himalayan Startup Raises $5M for Clean Energy Solutions",
    summary:
      "Kathmandu-based green energy startup HimalPower has raised $5 million in Series A funding to expand its micro-hydro power solutions across rural Nepal. The startup aims to electrify 500 villages by 2026.",
    imageUrl:
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format",
    sourceUrl: "https://myrepublica.nagariknetwork.com",
    sourceName: "My Republica",
    category: "business",
    language: "en",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-4",
    title: "Everest Base Camp Opens for 2025 Climbing Season",
    summary:
      "Nepal's Department of Tourism has officially opened the Everest Base Camp for the 2025 spring climbing season. Over 400 climbers from 40 countries have received permits, with enhanced safety protocols in place.",
    imageUrl:
      "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=800&auto=format",
    sourceUrl: "https://thehimalayantimes.com",
    sourceName: "Himalayan Times",
    category: "world",
    language: "en",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-5",
    title: "New Digital Payment System Launched for Rural Nepal",
    summary:
      "Nepal Rastra Bank has launched a new QR-based digital payment system targeting rural communities. The system works on basic mobile phones without internet, using USSD technology to enable cashless transactions.",
    imageUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format",
    sourceUrl: "https://kathmandupost.com",
    sourceName: "Kathmandu Post",
    category: "technology",
    language: "en",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-ne-1",
    title: "नेपाल सरकारले नयाँ आर्थिक नीति घोषणा गर्यो",
    summary:
      "नेपाल सरकारले आगामी आर्थिक वर्षमा जीडीपी वृद्धिदर ७ प्रतिशत पुर्‍याउने लक्ष्यसहित व्यापक आर्थिक नीति सार्वजनिक गरेको छ। यस नीतिमा पूर्वाधार विकास, पर्यटन पुनरुत्थान र डिजिटल रूपान्तरणमा विशेष जोड दिइएको छ।",
    imageUrl:
      "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=800&auto=format",
    sourceUrl: "https://ratopati.com",
    sourceName: "रातोपाटी",
    category: "politics",
    language: "ne",
    publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-ne-2",
    title: "नेपाली क्रिकेट टिम विश्वकप २०२५ मा छनौट",
    summary:
      "ऐतिहासिक उपलब्धिमा नेपालको राष्ट्रिय क्रिकेट टिमले मलेसियालाई ८ विकेटले हराएर आईसीसी विश्वकप २०२५ मा आफ्नो स्थान सुनिश्चित गरेको छ। कप्तान रोहित पौडेलले ९५ रनको शानदार पारी खेले।",
    imageUrl:
      "https://images.unsplash.com/photo-1540747913346-19212a4b3c55?w=800&auto=format",
    sourceUrl: "https://onlinekhabar.com",
    sourceName: "अनलाइनखबर",
    category: "sports",
    language: "ne",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-ne-3",
    title: "काठमाडौंमा वायु प्रदूषण खतरनाक स्तरमा पुग्यो",
    summary:
      "काठमाडौं उपत्यकामा वायु प्रदूषण खतरनाक स्तरमा पुगेको छ। AQI सूचकांक ३०० भन्दा माथि पुगेको छ जुन स्वास्थ्यका लागि अत्यन्त हानिकारक मानिन्छ। विज्ञहरूले मास्क लगाउन र घरबाहिर नजान सुझाव दिएका छन्।",
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format",
    sourceUrl: "https://setopati.com",
    sourceName: "सेतोपाटी",
    category: "health",
    language: "ne",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
  {
    id: "mock-ne-4",
    title: "सगरमाथा आरोहण सिजन सुरु, ४०० भन्दा बढी आरोही",
    summary:
      "नेपालको पर्यटन विभागले २०२५ को वसन्त आरोहण सिजनका लागि सगरमाथा बेस क्याम्प आधिकारिक रूपमा खोलेको छ। ४० देशका ४०० भन्दा बढी आरोहीले अनुमति लिएका छन् र थप सुरक्षा प्रोटोकलहरू लागू गरिएका छन्।",
    imageUrl:
      "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=800&auto=format",
    sourceUrl: "https://nagariknews.nagariknetwork.com",
    sourceName: "नागरिक न्यूज",
    category: "world",
    language: "ne",
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    isApproved: true,
  },
];
