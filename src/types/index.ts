export type Language =
  | "ne"   // नेपाली
  | "en"   // English
  | "hi"   // हिन्दी
  | "mai"  // मैथिली
  | "thr"  // थारू
  | "bho"  // भोजपुरी
  | "tam"  // तामाङ
  | "baj"  // बज्जिका
  | "awa"  // अवधी
  | "new"; // नेवारी

// Languages that have enough RSS sources (>3) to be shown in the UI.
// Others are kept in the type for future use but hidden from pickers.
export const SUPPORTED_LANGUAGES: Language[] = ["ne", "en"];

export const LANGUAGE_CONFIG: Record<Language, {
  label: string; nativeLabel: string; flag: string; rssLang: "ne" | "en";
}> = {
  ne:  { label: "Nepali",      nativeLabel: "नेपाली",              flag: "🇳🇵", rssLang: "ne" },
  en:  { label: "English",     nativeLabel: "English",              flag: "🇬🇧", rssLang: "en" },
  // No dedicated RSS feeds for these languages yet — fall back to English RSS
  // (better than Nepali for Hindi speakers; can be changed per language once feeds exist)
  hi:  { label: "Hindi",       nativeLabel: "हिन्दी",               flag: "🇮🇳", rssLang: "en" },
  mai: { label: "Maithali",    nativeLabel: "मैथिली",               flag: "🇳🇵", rssLang: "ne" },
  thr: { label: "Tharu",       nativeLabel: "थारू",                 flag: "🇳🇵", rssLang: "ne" },
  bho: { label: "Bhojpuri",    nativeLabel: "भोजपुरी",             flag: "🇳🇵", rssLang: "ne" },
  tam: { label: "Tamang",      nativeLabel: "तामाङ",                flag: "🇳🇵", rssLang: "ne" },
  baj: { label: "Bajjika",     nativeLabel: "बज्जिका",             flag: "🇳🇵", rssLang: "ne" },
  awa: { label: "Awadhi",      nativeLabel: "अवधी",                 flag: "🇳🇵", rssLang: "ne" },
  new: { label: "Nepal Bhasa", nativeLabel: "नेपाल भाषा (नेवारी)", flag: "🇳🇵", rssLang: "ne" },
};

export type TopicId =
  | "breaking" | "politics" | "local" | "business" | "startups"
  | "tech" | "sports" | "cricket" | "football" | "entertainment"
  | "bollywood" | "nepali-cinema" | "international" | "health"
  | "education" | "jobs" | "weather" | "travel" | "agriculture"
  | "nepse" | "crypto" | "government";

export type Province =
  | "koshi" | "madhesh" | "bagmati" | "gandaki"
  | "lumbini" | "karnali" | "sudurpashchim";

export type Category =
  | "all" | "politics" | "business" | "sports" | "technology"
  | "entertainment" | "health" | "world" | "education";

// ═══════════════════════════════════════════
// REGION
// ═══════════════════════════════════════════
export type RegionId =
  | "nepal" | "kathmandu" | "pokhara" | "madhesh"
  | "lumbini" | "koshi" | "gandaki" | "karnali"
  | "sudurpashchim" | "international";

export const REGION_CONFIG: Record<RegionId, { label: string; labelNe: string; emoji: string }> = {
  nepal:          { label: "All Nepal",       labelNe: "सम्पूर्ण नेपाल",    emoji: "🇳🇵" },
  kathmandu:      { label: "Kathmandu",       labelNe: "काठमाडौं",           emoji: "🏛️" },
  pokhara:        { label: "Pokhara",         labelNe: "पोखरा",              emoji: "⛵" },
  madhesh:        { label: "Madhesh",         labelNe: "मधेश",               emoji: "🌾" },
  lumbini:        { label: "Lumbini",         labelNe: "लुम्बिनी",           emoji: "🌸" },
  koshi:          { label: "Koshi",           labelNe: "कोशी",               emoji: "🌊" },
  gandaki:        { label: "Gandaki",         labelNe: "गण्डकी",             emoji: "🏔️" },
  karnali:        { label: "Karnali",         labelNe: "कर्णाली",            emoji: "🏞️" },
  sudurpashchim:  { label: "Sudurpashchim",   labelNe: "सुदूरपश्चिम",        emoji: "🌄" },
  international:  { label: "International",   labelNe: "अन्तर्राष्ट्रिय",    emoji: "🌏" },
};

// ═══════════════════════════════════════════
// USER PREFERENCES
// ═══════════════════════════════════════════
export interface UserPrefs {
  language: Language;
  region: RegionId;
  province: Province | null;    // kept for backwards compat
  district: string | null;
  city: string | null;
  topics: TopicId[];
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  savedArticleIds: string[];
}

export const DEFAULT_PREFS: UserPrefs = {
  language: "ne",
  region: "nepal",
  province: null,
  district: null,
  city: null,
  topics: ["breaking", "politics", "sports", "tech", "entertainment"],
  onboardingCompleted: false,
  notificationsEnabled: false,
  savedArticleIds: [],
};

// ═══════════════════════════════════════════
// NEWS ARTICLE
// ═══════════════════════════════════════════
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  fullContent?: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  sourceLogoUrl?: string;
  category: Category;
  topics?: TopicId[];
  language: "ne" | "en";
  province?: Province;
  publishedAt: string;
  fetchedAt: string;
  isApproved: boolean;
  isBreaking?: boolean;
  readTimeSeconds?: number;
  viewCount?: number;
  slug?: string;          // SEO-friendly URL slug
  contentType?: "editorial" | "sponsored" | "advertisement";
}

export interface NewsSource {
  id: string;
  name: string;
  nameNe?: string;
  url: string;
  language: "ne" | "en";
  category: Category;
  isActive: boolean;
  lastFetched?: string;
  articleCount?: number;
}

export interface AdminStats {
  totalArticles: number;
  pendingArticles: number;
  totalSources: number;
  activeSources: number;
  todayArticles: number;
  englishArticles: number;
  nepaliArticles: number;
}

// ═══════════════════════════════════════════
// SPONSORED CAMPAIGN
// ═══════════════════════════════════════════
export type CreativeType = "article_card" | "banner" | "inline_card" | "breaking_strip" | "carousel_card";
export type LabelType = "Sponsored" | "Advertisement" | "Partner Content";
export type PlacementLocation = "home_feed" | "category_feed" | "article_detail" | "breaking_ticker";
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "expired";

export interface SponsoredCampaign {
  id: string;
  name: string;
  sponsorName: string;
  creativeType: CreativeType;
  labelType: LabelType;
  title: string;
  description: string;
  imageUrl?: string;
  landingUrl: string;
  ctaText: string;
  placementRules: {
    locations: PlacementLocation[];
    categories: string[];
    provinces: string[];
    deviceTargeting: "mobile" | "desktop" | "all";
  };
  frequencyRules: {
    impressionsPerUserPerDay: number;
    minGapMinutes: number;
    maxRepeatsPerSession: number;
    showEveryNCards: number;
  };
  budget: {
    type: "impression_cap" | "fixed_budget";
    cap: number;
    spent: number;
  };
  schedule: {
    startDate: string;
    endDate: string;
    priority: number;
  };
  status: CampaignStatus;
  stats: {
    impressions: number;
    clicks: number;
    uniqueUsers: number;
    ctr: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════
// REFERRAL SYSTEM
// ═══════════════════════════════════════════
export interface ReferralCode {
  code: string;
  userId: string;
  userName: string;
  createdAt: string;
  clicks: number;
  installs: number;
  signups: number;
  rewardsCredited: number;
  isActive: boolean;
}

export interface ReferralEvent {
  id: string;
  code: string;
  referrerId: string;
  eventType: "click" | "install" | "signup" | "first_action";
  timestamp: string;
  deviceId?: string;
  ip?: string;
  userId?: string;
  rewarded: boolean;
  rewardAmount: number;
  fraudFlags: string[];
  sessionId?: string;
}

export interface ReferralConfig {
  clickReward: number;
  installReward: number;
  signupReward: number;
  firstActionReward: number;
  cooldownHours: number;
  maxRewardsPerReferrer: number;
  campaignActive: boolean;
  campaignStartDate: string;
  campaignEndDate: string;
}

// ═══════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════
export type AnalyticsEventType =
  | "article_view"
  | "read_completion"
  | "share"
  | "notification_open"
  | "referral_click"
  | "app_install"
  | "signup"
  | "gem_credit"
  | "sponsored_impression"
  | "sponsored_click"
  | "social_post"
  | "poll_answer"
  | "audio_listen"
  | "search";

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  articleId?: string;
  campaignId?: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  language?: string;
  province?: string;
  topic?: string;
  metadata?: Record<string, string | number | boolean>;
}

// ═══════════════════════════════════════════
// SOCIAL MEDIA
// ═══════════════════════════════════════════
export type SocialPlatform = "facebook" | "instagram" | "twitter";

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  articleId: string;
  articleTitle: string;
  content: string;
  imageUrl?: string;
  url: string;
  status: "pending" | "published" | "failed";
  platformPostId?: string;
  publishedAt?: string;
  error?: string;
  createdAt: string;
  clicks: number;
}

// ═══════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════
export interface PushSubscription {
  userId: string;
  endpoint: string;
  // Web push uses keys; Expo push uses expoPushToken; native FCM uses fcmToken.
  keys?: { p256dh: string; auth: string };
  kind?: "web" | "expo" | "fcm";
  expoPushToken?: string;
  fcmToken?: string;
  topics: TopicId[];
  language: string;
  createdAt: string;
}

export interface PushNotificationLog {
  id: string;
  articleId?: string;
  title: string;
  body: string;
  sentAt: string;
  recipientCount: number;
  openCount: number;
  targetTopics: TopicId[];
}
