// Comprehensive analytics tracking store
import { AnalyticsEvent, AnalyticsEventType } from "@/types";

const MAX_EVENTS = 10000;
let events: AnalyticsEvent[] = [];

// In-memory daily aggregates (keyed by "YYYY-MM-DD")
const dailyActive = new Map<string, Set<string>>(); // date → Set of userIds/sessionIds

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function genId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const analyticsStore = {
  track(event: Omit<AnalyticsEvent, "id" | "timestamp">): AnalyticsEvent {
    const full: AnalyticsEvent = {
      ...event,
      id: genId(),
      timestamp: new Date().toISOString(),
    };
    events.unshift(full);
    if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);

    // Update daily active
    const today = todayStr();
    if (!dailyActive.has(today)) dailyActive.set(today, new Set());
    const key = event.userId ?? event.sessionId;
    dailyActive.get(today)!.add(key);

    return full;
  },

  getEvents(type?: AnalyticsEventType, limit = 100): AnalyticsEvent[] {
    const filtered = type ? events.filter((e) => e.type === type) : events;
    return filtered.slice(0, limit);
  },

  // ─── Aggregated metrics ───────────────────────────────────────────────────
  getDashboardStats() {
    const now = Date.now();
    const today = todayStr();
    const yesterday = new Date(now - 86400000).toISOString().split("T")[0];
    const last7Days = Array.from({ length: 7 }, (_, i) =>
      new Date(now - i * 86400000).toISOString().split("T")[0]
    );

    const todayEvents = events.filter((e) => e.timestamp.startsWith(today));

    // DAU (unique session IDs today)
    const dauSet = new Set(todayEvents.map((e) => e.userId ?? e.sessionId));
    const dau = dauSet.size;

    // MAU (last 30 days unique)
    const mauCutoff = new Date(now - 30 * 86400000).toISOString();
    const mauSet = new Set(
      events.filter((e) => e.timestamp > mauCutoff).map((e) => e.userId ?? e.sessionId)
    );
    const mau = mauSet.size;

    // Article views today
    const viewsToday = todayEvents.filter((e) => e.type === "article_view").length;

    // Read completions
    const completions = todayEvents.filter((e) => e.type === "read_completion").length;
    const completionRate = viewsToday > 0 ? (completions / viewsToday) * 100 : 0;

    // Shares
    const sharesToday = todayEvents.filter((e) => e.type === "share").length;

    // Notification opens
    const notifOpens = todayEvents.filter((e) => e.type === "notification_open").length;

    // Sponsored
    const sponsoredImpressions = events.filter((e) => e.type === "sponsored_impression").length;
    const sponsoredClicks = events.filter((e) => e.type === "sponsored_click").length;
    const sponsoredCtr = sponsoredImpressions > 0
      ? (sponsoredClicks / sponsoredImpressions) * 100 : 0;

    // Top articles (by view count)
    const articleViews: Record<string, number> = {};
    events.filter((e) => e.type === "article_view" && e.articleId).forEach((e) => {
      articleViews[e.articleId!] = (articleViews[e.articleId!] ?? 0) + 1;
    });
    const topArticles = Object.entries(articleViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, views]) => ({ id, views }));

    // Top topics
    const topicViews: Record<string, number> = {};
    events.filter((e) => e.type === "article_view" && e.topic).forEach((e) => {
      topicViews[e.topic!] = (topicViews[e.topic!] ?? 0) + 1;
    });
    const topTopics = Object.entries(topicViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, views]) => ({ topic, views }));

    // Daily trend (last 7 days)
    const dailyTrend = last7Days.reverse().map((date) => ({
      date,
      views: events.filter((e) => e.timestamp.startsWith(date) && e.type === "article_view").length,
      users: dailyActive.get(date)?.size ?? 0,
    }));

    // Referral stats
    const referralClicks = events.filter((e) => e.type === "referral_click").length;
    const signups = events.filter((e) => e.type === "signup").length;
    const gemCredits = events.filter((e) => e.type === "gem_credit").length;
    const totalGemsIssued = events
      .filter((e) => e.type === "gem_credit")
      .reduce((s, e) => s + ((e.metadata?.amount as number) ?? 0), 0);

    return {
      dau, mau,
      viewsToday, completionRate, sharesToday, notifOpens,
      sponsoredImpressions, sponsoredClicks, sponsoredCtr,
      topArticles, topTopics, dailyTrend,
      referralClicks, signups, gemCredits, totalGemsIssued,
      totalEvents: events.length,
    };
  },

  // Social post analytics
  getSocialStats() {
    const socialEvents = events.filter((e) => e.type === "social_post");
    const byPlatform: Record<string, number> = {};
    socialEvents.forEach((e) => {
      const p = (e.metadata?.platform as string) ?? "unknown";
      byPlatform[p] = (byPlatform[p] ?? 0) + 1;
    });
    return { total: socialEvents.length, byPlatform };
  },
};
