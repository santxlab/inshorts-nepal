// Push notification manager — behavior-aware targeting with daily frequency cap.
// Subscriptions are persisted in MongoDB (via mongoose).
// Falls back to in-memory map if MONGODB_URI is not configured.
import type { PushSubscription, PushNotificationLog, TopicId } from "@/types";
import { connectDB } from "./db";
import { PushSubscriptionModel } from "@/models/PushSubscriptionModel";

// ── In-memory fallback (used when MongoDB is unavailable) ─────────────────────
const memSubs = new Map<string, PushSubscription>();

// Per-subscriber daily send tracking (in-memory; resets on cold start — acceptable)
const dailySentMap = new Map<string, { date: string; count: number }>();

// Per-subscriber behavioral topic scores (updated from client; in-memory)
const subscriberBehaviorScores = new Map<string, Record<string, number>>();

const logs: PushNotificationLog[] = [];

const DAILY_PUSH_CAP = 5;

// VAPID keys — generate with: npx web-push generate-vapid-keys
const VAPID_SUBJECT    = process.env.VAPID_SUBJECT    ?? "mailto:admin@inshortsnepal.org";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function isDbAvailable(): Promise<boolean> {
  const conn = await connectDB();
  return conn !== null;
}

/** Whether the daily cap allows sending to this endpoint right now. */
function canSendToSubscriber(endpoint: string, isBreaking: boolean): boolean {
  if (isBreaking) return true;
  const today = todayStr();
  const rec = dailySentMap.get(endpoint);
  if (!rec || rec.date !== today) return true;
  return rec.count < DAILY_PUSH_CAP;
}

function incrementDailyCount(endpoint: string): void {
  const today = todayStr();
  const rec = dailySentMap.get(endpoint);
  if (!rec || rec.date !== today) {
    dailySentMap.set(endpoint, { date: today, count: 1 });
  } else {
    rec.count++;
  }
}

function behaviorRelevanceScore(endpoint: string, topics: TopicId[]): number {
  const scores = subscriberBehaviorScores.get(endpoint);
  if (!scores || topics.length === 0) return 50;
  const sum = topics.reduce((acc, t) => acc + (scores[t] ?? 50), 0);
  return sum / topics.length;
}

export const pushManager = {
  // ── Subscription management ───────────────────────────────────────────────
  async saveSubscription(sub: PushSubscription): Promise<void> {
    const dbOk = await isDbAvailable();
    if (dbOk) {
      try {
        await PushSubscriptionModel.findOneAndUpdate(
          { endpoint: sub.endpoint },
          {
            userId:   sub.userId,
            endpoint: sub.endpoint,
            keys:     sub.keys,
            topics:   sub.topics,
            language: sub.language,
          },
          { upsert: true, new: true }
        );
        return;
      } catch (err) {
        console.error("[pushManager] DB save failed, using memory fallback:", err);
      }
    }
    memSubs.set(sub.endpoint, sub);
  },

  async removeSubscription(endpoint: string): Promise<void> {
    dailySentMap.delete(endpoint);
    subscriberBehaviorScores.delete(endpoint);
    const dbOk = await isDbAvailable();
    if (dbOk) {
      try {
        await PushSubscriptionModel.deleteOne({ endpoint });
        return;
      } catch { /* fallthrough */ }
    }
    memSubs.delete(endpoint);
  },

  updateSubscriberBehavior(endpoint: string, topicScores: Record<string, number>): void {
    subscriberBehaviorScores.set(endpoint, topicScores);
    // Best-effort persist to DB in background
    connectDB().then((conn) => {
      if (!conn) return;
      PushSubscriptionModel.updateOne({ endpoint }, { topicScores }).catch(() => {});
    });
  },

  async getSubscriptions(filter?: {
    topics?: TopicId[];
    language?: string;
    minBehaviorScore?: number;
    articleTopics?: TopicId[];
  }): Promise<PushSubscription[]> {
    let all: PushSubscription[] = [];

    const dbOk = await isDbAvailable();
    if (dbOk) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.language) query.language = filter.language;
        if (filter?.topics && filter.topics.length > 0) {
          query.topics = { $in: filter.topics };
        }
        const docs = await PushSubscriptionModel.find(query).lean();
        all = docs.map((d) => ({
          userId:   d.userId,
          endpoint: d.endpoint,
          keys:     d.keys as { p256dh: string; auth: string },
          topics:   d.topics as TopicId[],
          language: d.language,
          createdAt: (d as { createdAt: Date }).createdAt?.toISOString() ?? "",
        }));
      } catch (err) {
        console.error("[pushManager] DB query failed, using memory fallback:", err);
        all = [...memSubs.values()];
      }
    } else {
      all = [...memSubs.values()];
      if (filter?.language) all = all.filter((s) => s.language === filter.language);
      if (filter?.topics?.length) all = all.filter((s) => s.topics.some((t) => filter.topics!.includes(t)));
    }

    // Behavioral filter (always in-memory)
    if (filter?.minBehaviorScore !== undefined && filter?.articleTopics?.length) {
      all = all.filter(
        (s) => behaviorRelevanceScore(s.endpoint, filter.articleTopics!) >= filter.minBehaviorScore!
      );
    }

    return all;
  },

  async getSubscriptionCount(): Promise<number> {
    const dbOk = await isDbAvailable();
    if (dbOk) {
      try {
        return await PushSubscriptionModel.countDocuments();
      } catch { /* fallthrough */ }
    }
    return memSubs.size;
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

  // ── Core send ─────────────────────────────────────────────────────────────
  async sendToSubscribers(
    payload: { title: string; body: string; url?: string; icon?: string; tag?: string },
    options: {
      filter?: { topics?: TopicId[]; language?: string };
      isBreaking?: boolean;
      articleTopics?: TopicId[];
      minBehaviorScore?: number;
    } = {}
  ): Promise<{ sent: number; failed: number; skippedCap: number }> {
    if (!VAPID_PRIVATE_KEY) {
      console.warn("[pushManager] VAPID keys not configured — push disabled");
      return { sent: 0, failed: 0, skippedCap: 0 };
    }

    const { isBreaking = false, articleTopics, minBehaviorScore = 40 } = options;

    const targets = await this.getSubscriptions({
      ...options.filter,
      articleTopics,
      minBehaviorScore: articleTopics?.length ? minBehaviorScore : undefined,
    });

    let sent = 0;
    let failed = 0;
    let skippedCap = 0;

    const webpush = await import("web-push").catch(() => null);
    if (!webpush) {
      console.warn("[pushManager] web-push not installed");
      return { sent: 0, failed: 0, skippedCap: 0 };
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    await Promise.allSettled(
      targets.map(async (sub) => {
        if (!canSendToSubscriber(sub.endpoint, isBreaking)) {
          skippedCap++;
          return;
        }
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: payload.title,
              body:  payload.body,
              url:   payload.url ?? "/",
              icon:  payload.icon ?? "/icon-512.png",
              tag:   payload.tag,
            })
          );
          incrementDailyCount(sub.endpoint);
          sent++;
        } catch (err: unknown) {
          if ((err as { statusCode?: number }).statusCode === 410) {
            await this.removeSubscription(sub.endpoint);
          }
          failed++;
        }
      })
    );

    // Log
    logs.unshift({
      id: `push-${Date.now()}`,
      title: payload.title,
      body: payload.body,
      sentAt: new Date().toISOString(),
      recipientCount: sent,
      openCount: 0,
      targetTopics: options.filter?.topics ?? [],
    });

    return { sent, failed, skippedCap };
  },

  // ── Specialised senders ───────────────────────────────────────────────────
  async sendBreakingNewsAlert(articleId: string, title: string, summary: string, topics: TopicId[]) {
    return this.sendToSubscribers(
      { title: `🚨 ${title}`, body: summary.slice(0, 100), url: `/news/${articleId}`, tag: `breaking-${articleId}` },
      { filter: { topics }, isBreaking: true, articleTopics: topics, minBehaviorScore: 30 }
    );
  },

  async sendTopStoryAlert(articleId: string, title: string, summary: string, topics: TopicId[], language: string) {
    return this.sendToSubscribers(
      { title: `📰 ${title}`, body: summary.slice(0, 100), url: `/news/${articleId}`, tag: `story-${articleId}` },
      { filter: { topics, language }, articleTopics: topics, minBehaviorScore: 55 }
    );
  },

  async sendMorningDigest(language: string) {
    return this.sendToSubscribers(
      {
        title: language === "ne" ? "☀️ बिहानको समाचार संक्षेप" : "☀️ Your Morning Nepal Brief",
        body:  language === "ne" ? "आजका शीर्ष समाचारहरू पढ्न तयार हुनुहोस्" : "Top stories personalized for you",
        url: "/", tag: "morning-digest",
      },
      { filter: { language } }
    );
  },

  async sendEveningDigest(language: string) {
    return this.sendToSubscribers(
      {
        title: language === "ne" ? "🌙 साँझको समाचार संक्षेप" : "🌙 Evening Nepal Brief",
        body:  language === "ne" ? "दिनभरका महत्त्वपूर्ण समाचारहरू" : "What mattered today in Nepal",
        url: "/", tag: "evening-digest",
      },
      { filter: { language } }
    );
  },

  async sendStreakReminder(endpoint: string, currentStreak: number, language: string) {
    const subs = await this.getSubscriptions();
    const sub = subs.find((s) => s.endpoint === endpoint);
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
          body: language === "ne" ? "आज अझै एउटा समाचार पढ्नुहोस्।" : "Read at least one story today.",
          url: "/", tag: "streak-reminder", icon: "/icon-512.png",
        })
      );
      incrementDailyCount(endpoint);
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        await this.removeSubscription(endpoint);
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
