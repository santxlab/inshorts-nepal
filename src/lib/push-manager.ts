// Push notification manager — behavior-aware targeting with daily frequency cap
import { PushSubscription, PushNotificationLog, TopicId } from "@/types";

const subscriptions = new Map<string, PushSubscription>(); // endpoint → subscription
const logs: PushNotificationLog[] = [];

// Per-subscriber daily send tracking (resets at midnight)
// key = endpoint, value = { date: "YYYY-MM-DD", count: number }
const dailySentMap = new Map<string, { date: string; count: number }>();

// Per-subscriber behavioral topic scores (updated from client)
// key = endpoint, value = Record<TopicId, number>
const subscriberBehaviorScores = new Map<string, Record<string, number>>();

const DAILY_PUSH_CAP = 5; // max non-breaking notifications per subscriber per day

// VAPID keys — generate with: npx web-push generate-vapid-keys
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@inshortsnepal.org";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** Returns true if we can send to this subscriber right now (cap not exceeded). */
function canSendToSubscriber(endpoint: string, isBreaking: boolean): boolean {
  if (isBreaking) return true; // breaking news always goes through
  const today = todayStr();
  const rec = dailySentMap.get(endpoint);
  if (!rec || rec.date !== today) return true; // new day or first send
  return rec.count < DAILY_PUSH_CAP;
}

/** Increments the daily counter for a subscriber. */
function incrementDailyCount(endpoint: string): void {
  const today = todayStr();
  const rec = dailySentMap.get(endpoint);
  if (!rec || rec.date !== today) {
    dailySentMap.set(endpoint, { date: today, count: 1 });
  } else {
    rec.count++;
  }
}

/**
 * Behavioral relevance score for a subscriber against an article's topics.
 * Returns 0–100. If no behavioral data, defaults to 50 (neutral).
 */
function behaviorRelevanceScore(endpoint: string, topics: TopicId[]): number {
  const scores = subscriberBehaviorScores.get(endpoint);
  if (!scores || topics.length === 0) return 50;
  const sum = topics.reduce((acc, t) => acc + (scores[t] ?? 50), 0);
  return sum / topics.length;
}

export const pushManager = {
  // ─── Subscription management ─────────────────────────────────────────────
  saveSubscription(sub: PushSubscription): void {
    subscriptions.set(sub.endpoint, sub);
  },

  removeSubscription(endpoint: string): void {
    subscriptions.delete(endpoint);
    dailySentMap.delete(endpoint);
    subscriberBehaviorScores.delete(endpoint);
  },

  /** Called by the client to keep server-side behavioral scores in sync. */
  updateSubscriberBehavior(endpoint: string, topicScores: Record<string, number>): void {
    subscriberBehaviorScores.set(endpoint, topicScores);
  },

  getSubscriptions(filter?: {
    topics?: TopicId[];
    language?: string;
    minBehaviorScore?: number; // 0-100, filter by behavioral interest
    articleTopics?: TopicId[]; // used with minBehaviorScore
  }): PushSubscription[] {
    let all = [...subscriptions.values()];

    if (filter?.language) {
      all = all.filter((s) => s.language === filter.language);
    }
    // Static topic filter: subscriber opted into at least one matching topic
    if (filter?.topics && filter.topics.length > 0) {
      all = all.filter((s) => s.topics.some((t) => filter.topics!.includes(t)));
    }
    // Behavioral filter: only subscribers who score above threshold for article topics
    if (filter?.minBehaviorScore !== undefined && filter.articleTopics && filter.articleTopics.length > 0) {
      all = all.filter(
        (s) => behaviorRelevanceScore(s.endpoint, filter.articleTopics!) >= filter.minBehaviorScore!
      );
    }
    return all;
  },

  getSubscriptionCount(): number {
    return subscriptions.size;
  },

  getDailyStats(): { totalSentToday: number; capsReached: number } {
    const today = todayStr();
    let totalSentToday = 0;
    let capsReached = 0;
    for (const rec of dailySentMap.values()) {
      if (rec.date === today) {
        totalSentToday += rec.count;
        if (rec.count >= DAILY_PUSH_CAP) capsReached++;
      }
    }
    return { totalSentToday, capsReached };
  },

  // ─── Core send ───────────────────────────────────────────────────────────
  async sendToSubscribers(
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
      tag?: string;
    },
    options: {
      filter?: { topics?: TopicId[]; language?: string };
      isBreaking?: boolean;       // exempt from daily cap
      articleTopics?: TopicId[];  // for behavioral relevance filtering
      minBehaviorScore?: number;  // default 40: only send if score >= this
    } = {}
  ): Promise<{ sent: number; failed: number; skippedCap: number }> {
    if (!VAPID_PRIVATE_KEY) {
      console.warn("VAPID keys not configured — push notifications disabled");
      return { sent: 0, failed: 0, skippedCap: 0 };
    }

    const { isBreaking = false, articleTopics, minBehaviorScore = 40 } = options;

    const targets = this.getSubscriptions({
      ...options.filter,
      articleTopics,
      minBehaviorScore: articleTopics?.length ? minBehaviorScore : undefined,
    });

    let sent = 0;
    let failed = 0;
    let skippedCap = 0;

    const webpush = await import("web-push").catch(() => null);
    if (!webpush) {
      console.warn("web-push not installed");
      return { sent: 0, failed: 0, skippedCap: 0 };
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    await Promise.allSettled(
      targets.map(async (sub) => {
        // ── Daily cap check ──
        if (!canSendToSubscriber(sub.endpoint, isBreaking)) {
          skippedCap++;
          return;
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url ?? "/",
              icon: payload.icon ?? "/icon-512.png",
              tag: payload.tag,
            })
          );
          incrementDailyCount(sub.endpoint);
          sent++;
        } catch (err: unknown) {
          if ((err as { statusCode?: number }).statusCode === 410) {
            this.removeSubscription(sub.endpoint);
          }
          failed++;
        }
      })
    );

    // Log the notification
    const log: PushNotificationLog = {
      id: `push-${Date.now()}`,
      title: payload.title,
      body: payload.body,
      sentAt: new Date().toISOString(),
      recipientCount: sent,
      openCount: 0,
      targetTopics: options.filter?.topics ?? [],
    };
    logs.unshift(log);

    return { sent, failed, skippedCap };
  },

  // ─── Specialised senders ─────────────────────────────────────────────────

  /** Breaking news — bypasses daily cap, uses behavioral scoring to target interested subscribers. */
  async sendBreakingNewsAlert(
    articleId: string,
    title: string,
    summary: string,
    topics: TopicId[]
  ) {
    return this.sendToSubscribers(
      {
        title: `🚨 ${title}`,
        body: summary.slice(0, 100),
        url: `/news/${articleId}`,
        tag: `breaking-${articleId}`,
      },
      {
        filter: { topics }, // static interest filter
        isBreaking: true,   // exempt from daily cap
        articleTopics: topics,
        minBehaviorScore: 30, // lower threshold for breaking
      }
    );
  },

  /** Regular important story — respects daily cap, behaviorally targeted. */
  async sendTopStoryAlert(
    articleId: string,
    title: string,
    summary: string,
    topics: TopicId[],
    language: string
  ) {
    return this.sendToSubscribers(
      {
        title: `📰 ${title}`,
        body: summary.slice(0, 100),
        url: `/news/${articleId}`,
        tag: `story-${articleId}`,
      },
      {
        filter: { topics, language },
        isBreaking: false,
        articleTopics: topics,
        minBehaviorScore: 55, // only subscribers with genuine interest
      }
    );
  },

  async sendMorningDigest(language: string) {
    return this.sendToSubscribers(
      {
        title: language === "ne" ? "☀️ बिहानको समाचार संक्षेप" : "☀️ Your Morning Nepal Brief",
        body: language === "ne"
          ? "आजका शीर्ष समाचारहरू पढ्न तयार हुनुहोस्"
          : "Top stories personalized for you",
        url: "/",
        tag: "morning-digest",
      },
      { filter: { language }, isBreaking: false }
    );
  },

  async sendEveningDigest(language: string) {
    return this.sendToSubscribers(
      {
        title: language === "ne" ? "🌙 साँझको समाचार संक्षेप" : "🌙 Evening Nepal Brief",
        body: language === "ne"
          ? "दिनभरका महत्त्वपूर्ण समाचारहरू"
          : "What mattered today in Nepal",
        url: "/",
        tag: "evening-digest",
      },
      { filter: { language }, isBreaking: false }
    );
  },

  /** Streak reminder — only if user hasn't read today. Non-breaking. */
  async sendStreakReminder(endpoint: string, currentStreak: number, language: string) {
    const sub = subscriptions.get(endpoint);
    if (!sub) return;
    if (!canSendToSubscriber(endpoint, false)) return;

    const webpush = await import("web-push").catch(() => null);
    if (!webpush || !VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({
          title: language === "ne"
            ? `🔥 आजको लगातार नतोड्नुहोस् (${currentStreak} दिन)!`
            : `🔥 Keep your ${currentStreak}-day streak alive!`,
          body: language === "ne"
            ? "आज अझै एउटा समाचार पढ्नुहोस्।"
            : "Read at least one story today.",
          url: "/",
          tag: "streak-reminder",
          icon: "/icon-512.png",
        })
      );
      incrementDailyCount(endpoint);
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        this.removeSubscription(endpoint);
      }
    }
  },

  recordOpen(logId: string): void {
    const log = logs.find((l) => l.id === logId);
    if (log) log.openCount++;
  },

  getLogs(limit = 50): PushNotificationLog[] {
    return logs.slice(0, limit);
  },

  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  },
};
