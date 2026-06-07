// Push notification manager — behavior-aware targeting with daily frequency cap.
// Subscriptions are persisted in MongoDB (via mongoose).
// Falls back to in-memory map if MONGODB_URI is not configured.
import type { PushSubscription, PushNotificationLog, TopicId } from "@/types";
import { connectDB } from "./db";
import { PushSubscriptionModel } from "@/models/PushSubscriptionModel";
import { sendFcm, isFcmConfigured } from "./fcm";

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
            userId:        sub.userId,
            endpoint:      sub.endpoint,
            kind:          sub.kind ?? "web",
            keys:          sub.keys,
            expoPushToken: sub.expoPushToken,
            fcmToken:      sub.fcmToken,
            topics:        sub.topics,
            language:      sub.language,
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
    /**
     * When true and topics is set, also include subscribers with NO topics
     * saved (i.e. topics: []). This ensures general-audience users still
     * receive breaking news even though they haven't personalized yet.
     */
    includeNoTopics?: boolean;
  }): Promise<PushSubscription[]> {
    let all: PushSubscription[] = [];

    const dbOk = await isDbAvailable();
    if (dbOk) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.language) query.language = filter.language;
        if (filter?.topics && filter.topics.length > 0) {
          if (filter.includeNoTopics) {
            // Subscribers with matching topics OR subscribers with no topics at all
            query.$or = [
              { topics: { $in: filter.topics } },
              { topics: { $size: 0 } },
            ];
          } else {
            query.topics = { $in: filter.topics };
          }
        }
        const docs = await PushSubscriptionModel.find(query).lean();
        all = docs.map((d) => ({
          userId:   d.userId,
          endpoint: d.endpoint,
          kind:     (d.kind as "web" | "expo" | "fcm") ?? "web",
          keys:     d.keys as { p256dh: string; auth: string } | undefined,
          expoPushToken: d.expoPushToken,
          fcmToken: d.fcmToken,
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
      if (filter?.topics?.length) {
        all = all.filter((s) =>
          (filter.includeNoTopics && s.topics.length === 0) ||
          s.topics.some((t) => filter.topics!.includes(t))
        );
      }
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
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
      tag?: string;
      // Phase 2.2: extras carried in the notification `data` so the mobile
      // tap handler can deep-link straight to the article.
      articleId?: string;
      sourceUrl?: string;
      language?: string;
    },
    options: {
      filter?: { topics?: TopicId[]; language?: string; includeNoTopics?: boolean };
      isBreaking?: boolean;
      articleTopics?: TopicId[];
      minBehaviorScore?: number;
    } = {}
  ): Promise<{ sent: number; failed: number; skippedCap: number }> {
    const { isBreaking = false, articleTopics, minBehaviorScore = 40 } = options;

    // Notification data payload — mobile reads this on tap and opens the
    // article URL in our in-app browser. Empty fields are omitted so we
    // don't ship "undefined" strings to FCM/Expo.
    const notifData: Record<string, string> = { url: payload.url ?? "/" };
    if (payload.articleId)  notifData.articleId  = payload.articleId;
    if (payload.sourceUrl)  notifData.sourceUrl  = payload.sourceUrl;
    if (payload.language)   notifData.language   = payload.language;

    const targets = await this.getSubscriptions({
      ...options.filter,
      articleTopics,
      minBehaviorScore: articleTopics?.length ? minBehaviorScore : undefined,
    });

    let sent = 0;
    let failed = 0;
    let skippedCap = 0;

    // Partition by transport: web-push (browser) · Expo · direct FCM (native app).
    const webTargets  = targets.filter((s) => s.kind === "web" && s.keys);
    const expoTargets = targets.filter((s) => s.kind === "expo" && s.expoPushToken);
    const fcmTargets  = targets.filter((s) => s.kind === "fcm" && s.fcmToken);

    // ── Web push ──────────────────────────────────────────────────────────────
    if (webTargets.length > 0 && VAPID_PRIVATE_KEY) {
      const webpush = await import("web-push").catch(() => null);
      if (webpush) {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        await Promise.allSettled(
          webTargets.map(async (sub) => {
            if (!canSendToSubscriber(sub.endpoint, isBreaking)) { skippedCap++; return; }
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys! },
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
      }
    }

    // ── Expo push (native app) ──────────────────────────────────────────────────
    if (expoTargets.length > 0) {
      const eligible = expoTargets.filter((s) => {
        if (canSendToSubscriber(s.endpoint, isBreaking)) return true;
        skippedCap++;
        return false;
      });
      // Expo accepts up to 100 messages per request.
      const messages = eligible.map((s) => ({
        to: s.expoPushToken!,
        title: payload.title,
        body: payload.body,
        sound: "default",
        data: notifData,
      }));
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        try {
          const res = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(chunk),
          });
          const json = await res.json().catch(() => null);
          const tickets: { status?: string }[] = json?.data ?? [];
          chunk.forEach((m, idx) => {
            const ticket = tickets[idx];
            if (ticket?.status === "ok" || !ticket) {
              const sub = eligible[i + idx];
              if (sub) incrementDailyCount(sub.endpoint);
              sent++;
            } else {
              failed++;
            }
          });
        } catch {
          failed += chunk.length;
        }
      }
    }

    // ── Direct FCM (native app) ─────────────────────────────────────────────────
    if (fcmTargets.length > 0 && isFcmConfigured()) {
      await Promise.allSettled(
        fcmTargets.map(async (sub) => {
          if (!canSendToSubscriber(sub.endpoint, isBreaking)) { skippedCap++; return; }
          const result = await sendFcm({
            token: sub.fcmToken!,
            title: payload.title,
            body: payload.body,
            data: notifData,
          });
          if (result === "ok") {
            incrementDailyCount(sub.endpoint);
            sent++;
          } else if (result === "invalid") {
            await this.removeSubscription(sub.endpoint); // prune dead token
            failed++;
          } else {
            failed++;
          }
        })
      );
    }

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

    const title = language === "ne"
      ? `🔥 आजको लगातार नतोड्नुहोस् (${currentStreak} दिन)!`
      : `🔥 Keep your ${currentStreak}-day streak alive!`;
    const body = language === "ne" ? "आज अझै एउटा समाचार पढ्नुहोस्।" : "Read at least one story today.";

    // Native (direct FCM) subscriber
    if (sub.kind === "fcm" && sub.fcmToken) {
      const r = await sendFcm({ token: sub.fcmToken, title, body, data: { url: "/" } });
      if (r === "ok") incrementDailyCount(endpoint);
      else if (r === "invalid") await this.removeSubscription(endpoint);
      return;
    }

    // Native (Expo) subscriber
    if (sub.kind === "expo" && sub.expoPushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ to: sub.expoPushToken, title, body, sound: "default", data: { url: "/" } }),
        });
        incrementDailyCount(endpoint);
      } catch { /* ignore */ }
      return;
    }

    // Web subscriber
    if (!sub.keys) return;
    const webpush = await import("web-push").catch(() => null);
    if (!webpush || !VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({
          title, body, url: "/", tag: "streak-reminder", icon: "/icon-512.png",
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
