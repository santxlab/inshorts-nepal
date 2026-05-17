import { NewsArticle, NewsSource, Category, Language } from "@/types";

// Seed data — always available on startup
const SEED_ARTICLES: NewsArticle[] = [
  {
    id: "mock-1", title: "Nepal Government Announces New Economic Policy for 2024",
    summary: "The Nepal government has unveiled a comprehensive economic policy aimed at boosting GDP growth by 7% in the upcoming fiscal year. The policy focuses on infrastructure development, tourism revival, and digital transformation.",
    imageUrl: "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=800&auto=format",
    sourceUrl: "https://kathmandupost.com", sourceName: "Kathmandu Post", category: "politics", language: "en",
    topics: ["politics", "business"], readTimeSeconds: 90, viewCount: 4820,
    publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-2", title: "Nepal Cricket Team Qualifies for ICC World Cup 2025",
    summary: "In a historic achievement, Nepal's national cricket team has secured its spot in the ICC Cricket World Cup 2025 after defeating Malaysia by 8 wickets. Captain Rohit Paudel led with a stunning 95-run innings.",
    imageUrl: "https://images.unsplash.com/photo-1540747913346-19212a4b3c55?w=800&auto=format",
    sourceUrl: "https://kathmandupost.com", sourceName: "Kathmandu Post", category: "sports", language: "en",
    topics: ["cricket", "sports"], isBreaking: true, readTimeSeconds: 75, viewCount: 12500,
    publishedAt: new Date(Date.now() - 4 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-3", title: "Himalayan Startup Raises $5M for Clean Energy Solutions",
    summary: "Kathmandu-based green energy startup HimalPower has raised $5 million in Series A funding to expand its micro-hydro power solutions across rural Nepal. The startup aims to electrify 500 villages by 2026.",
    imageUrl: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&auto=format",
    sourceUrl: "https://myrepublica.nagariknetwork.com", sourceName: "My Republica", category: "business", language: "en",
    topics: ["startups", "business", "tech"], readTimeSeconds: 120, viewCount: 3200,
    publishedAt: new Date(Date.now() - 6 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-4", title: "Everest Base Camp Opens for 2025 Climbing Season",
    summary: "Nepal's Department of Tourism has officially opened the Everest Base Camp for the 2025 spring climbing season. Over 400 climbers from 40 countries have received permits, with enhanced safety protocols in place.",
    imageUrl: "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=800&auto=format",
    sourceUrl: "https://thehimalayantimes.com", sourceName: "Himalayan Times", category: "world", language: "en",
    topics: ["travel", "international"], readTimeSeconds: 80, viewCount: 8100,
    publishedAt: new Date(Date.now() - 8 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-5", title: "New Digital Payment System Launched for Rural Nepal",
    summary: "Nepal Rastra Bank has launched a new QR-based digital payment system targeting rural communities. The system works on basic mobile phones without internet, using USSD technology to enable cashless transactions.",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format",
    sourceUrl: "https://kathmandupost.com", sourceName: "Kathmandu Post", category: "technology", language: "en",
    topics: ["tech", "business"], readTimeSeconds: 100, viewCount: 5600,
    publishedAt: new Date(Date.now() - 10 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-6", title: "NEPSE Index Surges 3.2% on Foreign Investment News",
    summary: "Nepal Stock Exchange (NEPSE) index surged 3.2% on Thursday following news of increased foreign direct investment approvals. Banking and hydropower stocks led the rally with analysts expecting sustained momentum.",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format",
    sourceUrl: "https://thehimalayantimes.com", sourceName: "Himalayan Times", category: "business", language: "en",
    topics: ["nepse", "business"], readTimeSeconds: 85, viewCount: 6900,
    publishedAt: new Date(Date.now() - 3 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-7", title: "Nepal Weather Alert: Heavy Monsoon Rains Expected This Week",
    summary: "The Department of Hydrology and Meteorology has issued a yellow alert for heavy rainfall across multiple provinces. Residents in flood-prone areas are urged to remain vigilant as rivers may overflow.",
    imageUrl: "https://images.unsplash.com/photo-1504608524841-42584120d693?w=800&auto=format",
    sourceUrl: "https://myrepublica.nagariknetwork.com", sourceName: "My Republica", category: "all", language: "en",
    topics: ["weather", "local"], isBreaking: true, readTimeSeconds: 60, viewCount: 15300,
    publishedAt: new Date(Date.now() - 1 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-ne-1", title: "नेपाल सरकारले नयाँ आर्थिक नीति घोषणा गर्यो",
    summary: "नेपाल सरकारले आगामी आर्थिक वर्षमा जीडीपी वृद्धिदर ७ प्रतिशत पुर्‍याउने लक्ष्यसहित व्यापक आर्थिक नीति सार्वजनिक गरेको छ। यस नीतिमा पूर्वाधार विकास, पर्यटन पुनरुत्थान र डिजिटल रूपान्तरणमा विशेष जोड दिइएको छ।",
    imageUrl: "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=800&auto=format",
    sourceUrl: "https://ratopati.com", sourceName: "रातोपाटी", category: "politics", language: "ne",
    topics: ["politics", "business"], readTimeSeconds: 90, viewCount: 6200,
    publishedAt: new Date(Date.now() - 1 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-ne-2", title: "नेपाली क्रिकेट टिम विश्वकप २०२५ मा छनौट",
    summary: "ऐतिहासिक उपलब्धिमा नेपालको राष्ट्रिय क्रिकेट टिमले मलेसियालाई ८ विकेटले हराएर आईसीसी विश्वकप २०२५ मा आफ्नो स्थान सुनिश्चित गरेको छ। कप्तान रोहित पौडेलले ९५ रनको शानदार पारी खेले।",
    imageUrl: "https://images.unsplash.com/photo-1540747913346-19212a4b3c55?w=800&auto=format",
    sourceUrl: "https://onlinekhabar.com", sourceName: "अनलाइनखबर", category: "sports", language: "ne",
    topics: ["cricket", "sports"], isBreaking: true, readTimeSeconds: 75, viewCount: 18700,
    publishedAt: new Date(Date.now() - 3 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-ne-3", title: "काठमाडौंमा वायु प्रदूषण खतरनाक स्तरमा पुग्यो",
    summary: "काठमाडौं उपत्यकामा वायु प्रदूषण खतरनाक स्तरमा पुगेको छ। AQI सूचकांक ३०० भन्दा माथि पुगेको छ जुन स्वास्थ्यका लागि अत्यन्त हानिकारक मानिन्छ। विज्ञहरूले मास्क लगाउन र घरबाहिर नजान सुझाव दिएका छन्।",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format",
    sourceUrl: "https://setopati.com", sourceName: "सेतोपाटी", category: "health", language: "ne",
    topics: ["health", "local", "weather"], readTimeSeconds: 80, viewCount: 9400,
    publishedAt: new Date(Date.now() - 5 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-ne-4", title: "सगरमाथा आरोहण सिजन सुरु, ४०० भन्दा बढी आरोही",
    summary: "नेपालको पर्यटन विभागले २०२५ को वसन्त आरोहण सिजनका लागि सगरमाथा बेस क्याम्प आधिकारिक रूपमा खोलेको छ। ४० देशका ४०० भन्दा बढी आरोहीले अनुमति लिएका छन् र थप सुरक्षा प्रोटोकलहरू लागू गरिएका छन्।",
    imageUrl: "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=800&auto=format",
    sourceUrl: "https://nagariknews.nagariknetwork.com", sourceName: "नागरिक न्यूज", category: "world", language: "ne",
    topics: ["travel", "international"], readTimeSeconds: 70, viewCount: 11200,
    publishedAt: new Date(Date.now() - 7 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-ne-5", title: "नेपालमा बेरोजगारी बढ्दो, युवाहरू विदेश पलायन",
    summary: "श्रम तथा रोजगार मन्त्रालयका अनुसार गत वर्ष ५ लाखभन्दा बढी नेपालीले वैदेशिक रोजगारीका लागि श्रम स्वीकृति लिए। विज्ञहरूले देशमै रोजगारी सिर्जना गर्न सरकारलाई आग्रह गरेका छन्।",
    imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format",
    sourceUrl: "https://ratopati.com", sourceName: "रातोपाटी", category: "business", language: "ne",
    topics: ["jobs", "local", "international"], readTimeSeconds: 95, viewCount: 7800,
    publishedAt: new Date(Date.now() - 9 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
  {
    id: "mock-ne-6", title: "नेप्सेमा सेयर बजार उकालो, बैंकिङ क्षेत्रले नेतृत्व गर्यो",
    summary: "नेपाल धितोपत्र बोर्डको नवीनतम तथ्यांकअनुसार आजको कारोबारमा नेप्से परिसूचक ३२ अंकले वृद्धि भएको छ। बैंकिङ र जलविद्युत क्षेत्रका सेयरहरूमा ठूलो खरिदारी देखियो।",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format",
    sourceUrl: "https://onlinekhabar.com", sourceName: "अनलाइनखबर", category: "business", language: "ne",
    topics: ["nepse", "business"], readTimeSeconds: 65, viewCount: 5400,
    publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(), fetchedAt: new Date().toISOString(), isApproved: true,
  },
];

// In-memory store for prototype (replace with MongoDB in production)
let articles: NewsArticle[] = [...SEED_ARTICLES];
let sources: NewsSource[] = getDefaultSources();
let lastFetch: Record<string, number> = {};

function getDefaultSources(): NewsSource[] {
  return [
    // English Sources
    {
      id: "en-kpost",
      name: "Kathmandu Post",
      url: "https://kathmandupost.com/rss/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-okeng",
      name: "OnlineKhabar English",
      url: "https://english.onlinekhabar.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-nkeng",
      name: "Nepalkhabar English",
      url: "https://en.nepalkhabar.com/rss",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-khabarhub",
      name: "Khabarhub English",
      url: "https://english.khabarhub.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-annapurna",
      name: "Annapurna Express",
      url: "https://theannapurnaexpress.com/rss",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-rising",
      name: "Rising Nepal",
      url: "https://risingnepaldaily.com/rss",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-spotlight",
      name: "Spotlight Nepal",
      url: "https://www.spotlightnepal.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-nepalnews",
      name: "Nepal News",
      url: "https://nepalnews.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-ictframe",
      name: "ICT Frame",
      url: "https://ictframe.com/feed/",
      language: "en",
      category: "technology",
      isActive: true,
    },
    {
      id: "en-ratopati",
      name: "Ratopati English",
      url: "https://english.ratopati.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-nepalpress",
      name: "Nepal Press English",
      url: "https://english.nepalpress.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    {
      id: "en-lokpath",
      name: "Lokpath English",
      url: "https://english.lokpath.com/feed/",
      language: "en",
      category: "all",
      isActive: true,
    },
    // Nepali Sources
    {
      id: "ne-ratopati",
      name: "रातोपाटी",
      nameNe: "रातोपाटी",
      url: "https://ratopati.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-onlinekhabar",
      name: "अनलाइनखबर",
      nameNe: "अनलाइनखबर",
      url: "https://www.onlinekhabar.com/feed",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-setopati",
      name: "सेतोपाटी",
      nameNe: "सेतोपाटी",
      url: "https://setopati.com/feed",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-nagarik",
      name: "नागरिक न्यूज",
      nameNe: "नागरिक न्यूज",
      url: "https://nagariknews.nagariknetwork.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-annapurna",
      name: "अन्नपूर्ण पोस्ट",
      nameNe: "अन्नपूर्ण पोस्ट",
      url: "https://www.annapurnapost.com/rss/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-gorkhapatra",
      name: "गोरखापत्र",
      nameNe: "गोरखापत्र",
      url: "https://gorkhapatraonline.com/rss/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-deshsanchar",
      name: "देशसञ्चार",
      nameNe: "देशसञ्चार",
      url: "https://www.deshsanchar.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-nepalpress",
      name: "नेपाल प्रेस",
      nameNe: "नेपाल प्रेस",
      url: "https://www.nepalpress.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-imagekhabar",
      name: "इमेज खबर",
      nameNe: "इमेज खबर",
      url: "https://www.imagekhabar.com/rss/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-bizmandu",
      name: "बिजमाण्डू",
      nameNe: "बिजमाण्डू",
      url: "https://www.bizmandu.com/feed/",
      language: "ne",
      category: "business",
      isActive: true,
    },
    {
      id: "ne-karobar",
      name: "कारोबार",
      nameNe: "कारोबार",
      url: "https://www.karobardaily.com/feed/",
      language: "ne",
      category: "business",
      isActive: true,
    },
    {
      id: "ne-himalpress",
      name: "हिमाल प्रेस",
      nameNe: "हिमाल प्रेस",
      url: "https://www.himalpress.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-sourya",
      name: "सौर्य",
      nameNe: "सौर्य",
      url: "https://www.souryaonline.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-rajdhani",
      name: "राजधानी",
      nameNe: "राजधानी",
      url: "https://www.rajdhani.com.np/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-nepalkhabar",
      name: "नेपालखबर",
      nameNe: "नेपालखबर",
      url: "https://nepalkhabar.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-nepalsamaya",
      name: "नेपाल समय",
      nameNe: "नेपाल समय",
      url: "https://nepalsamaya.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-dainiknepal",
      name: "दैनिक नेपाल",
      nameNe: "दैनिक नेपाल",
      url: "https://www.dainiknepal.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-makalu",
      name: "मकालु खबर",
      nameNe: "मकालु खबर",
      url: "https://www.makalukhabar.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-lokantar",
      name: "लोकान्तर",
      nameNe: "लोकान्तर",
      url: "https://www.lokantar.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-dcnepal",
      name: "डीसी नेपाल",
      nameNe: "डीसी नेपाल",
      url: "https://www.dcnepal.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-reporters",
      name: "रिपोर्टर्स नेपाल",
      nameNe: "रिपोर्टर्स नेपाल",
      url: "https://www.reportersnepal.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-pahilopost",
      name: "पहिलोपोस्ट",
      nameNe: "पहिलोपोस्ट",
      url: "https://pahilopost.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-bbc",
      name: "BBC नेपाली",
      nameNe: "बीबीसी नेपाली",
      url: "https://feeds.bbci.co.uk/nepali/rss.xml",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-lokpath",
      name: "लोकपथ",
      nameNe: "लोकपथ",
      url: "https://lokpath.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-pratahkal",
      name: "प्रातःकाल",
      nameNe: "प्रातःकाल",
      url: "https://www.pratahkal.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
    {
      id: "ne-meronews",
      name: "मेरो खबर",
      nameNe: "मेरो खबर",
      url: "https://meronews.com/feed/",
      language: "ne",
      category: "all",
      isActive: true,
    },
  ];
}

export const store = {
  getArticles(lang?: Language, category?: Category): NewsArticle[] {
    let filtered = articles.filter((a) => a.isApproved);
    if (lang) filtered = filtered.filter((a) => a.language === lang);
    if (category && category !== "all")
      filtered = filtered.filter((a) => a.category === category);
    return filtered.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  },

  getAllArticles(): NewsArticle[] {
    return [...articles].sort(
      (a, b) =>
        new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
    );
  },

  addArticles(newArticles: NewsArticle[]): number {
    let added = 0;
    for (const article of newArticles) {
      const exists = articles.some(
        (a) => a.sourceUrl === article.sourceUrl || a.title === article.title
      );
      if (!exists) {
        articles.push(article);
        added++;
      }
    }
    // Keep max 500 articles
    if (articles.length > 500) {
      articles = articles
        .sort(
          (a, b) =>
            new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
        )
        .slice(0, 500);
    }
    return added;
  },

  approveArticle(id: string): boolean {
    const article = articles.find((a) => a.id === id);
    if (article) {
      article.isApproved = true;
      return true;
    }
    return false;
  },

  deleteArticle(id: string): boolean {
    const before = articles.length;
    articles = articles.filter((a) => a.id !== id);
    return articles.length < before;
  },

  getSources(): NewsSource[] {
    return sources;
  },

  addSource(source: Omit<NewsSource, "id">): NewsSource {
    const newSource: NewsSource = {
      ...source,
      id: `src-${Date.now()}`,
    };
    sources.push(newSource);
    return newSource;
  },

  updateSource(id: string, updates: Partial<NewsSource>): boolean {
    const source = sources.find((s) => s.id === id);
    if (source) {
      Object.assign(source, updates);
      return true;
    }
    return false;
  },

  deleteSource(id: string): boolean {
    const before = sources.length;
    sources = sources.filter((s) => s.id !== id);
    return sources.length < before;
  },

  getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      totalArticles: articles.length,
      pendingArticles: articles.filter((a) => !a.isApproved).length,
      totalSources: sources.length,
      activeSources: sources.filter((s) => s.isActive).length,
      todayArticles: articles.filter(
        (a) => new Date(a.fetchedAt) >= today
      ).length,
      englishArticles: articles.filter((a) => a.language === "en").length,
      nepaliArticles: articles.filter((a) => a.language === "ne").length,
    };
  },

  shouldFetch(sourceId: string): boolean {
    const last = lastFetch[sourceId] || 0;
    return Date.now() - last > 15 * 60 * 1000; // 15 minutes
  },

  markFetched(sourceId: string) {
    lastFetch[sourceId] = Date.now();
  },
};
