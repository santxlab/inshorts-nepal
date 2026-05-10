import Parser from "rss-parser";
import { NewsArticle, NewsSource, Category, Language } from "@/types";
import { store } from "./store";
import { detectTopics } from "./topics-config";

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
});

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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item: Parser.Item & { [key: string]: unknown }): string | undefined {
  // Try enclosure
  if (item.enclosure?.url) return item.enclosure.url;
  // Try media:content
  const media = item["media:content"] as { $?: { url?: string } } | undefined;
  if (media?.$?.url) return media.$.url;
  // Try extracting from content/description
  const content = (item["content:encoded"] as string) || item.content || item.summary || "";
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return undefined;
}

export async function fetchFromSource(
  source: NewsSource
): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const articles: NewsArticle[] = [];

    for (const item of feed.items.slice(0, 20)) {
      if (!item.title) continue;

      const rawSummary =
        (item["content:encoded"] as string) ||
        item.content ||
        item.summary ||
        item.contentSnippet ||
        "";

      const cleanSummary = stripHtml(rawSummary).slice(0, 300);
      const title = stripHtml(item.title);
      const category = guessCategory(title + " " + cleanSummary);
      const image = extractImage(item as Parser.Item & { [key: string]: unknown });

      const detectedTopics = detectTopics(title + " " + cleanSummary);

      articles.push({
        id: `${source.id}-${Buffer.from(item.link || item.title || Date.now().toString()).toString("base64").slice(0, 16)}`,
        title,
        summary: cleanSummary || title,
        imageUrl: image,
        sourceUrl: item.link || source.url,
        sourceName: source.name,
        category,
        topics: detectedTopics,
        language: source.language,
        publishedAt: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
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
