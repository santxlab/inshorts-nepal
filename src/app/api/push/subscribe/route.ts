import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";
import { PushSubscription, TopicId } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId, topics, language, topicScores, expoPushToken, fcmToken } = body;
    // Fall back to the X-Device-Id header the mobile client already sends on
    // every other API call, so older clients that don't post it in the body
    // still get linked to their behaviour profile.
    const deviceId: string | undefined =
      body.deviceId ?? req.headers.get("x-device-id") ?? undefined;

    // Native app (direct FCM) sends a raw FCM device token.
    if (fcmToken) {
      const fcmSub: PushSubscription = {
        userId: userId ?? "anon",
        deviceId,
        endpoint: fcmToken,                // token is the unique key
        kind: "fcm",
        fcmToken,
        topics: (topics as TopicId[]) ?? [],
        language: language ?? "ne",
        createdAt: new Date().toISOString(),
      };
      await pushManager.saveSubscription(fcmSub);
      if (topicScores && typeof topicScores === "object") {
        pushManager.updateSubscriberBehavior(fcmToken, topicScores);
      }
      return NextResponse.json({ success: true });
    }

    // Native (Expo) app sends an expoPushToken instead of a web-push subscription.
    if (expoPushToken) {
      const expoSub: PushSubscription = {
        userId: userId ?? "anon",
        endpoint: expoPushToken,           // token is the unique key
        kind: "expo",
        expoPushToken,
        topics: (topics as TopicId[]) ?? [],
        language: language ?? "ne",
        createdAt: new Date().toISOString(),
      };
      await pushManager.saveSubscription(expoSub);
      if (topicScores && typeof topicScores === "object") {
        pushManager.updateSubscriberBehavior(expoPushToken, topicScores);
      }
      return NextResponse.json({ success: true });
    }

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "subscription endpoint required" }, { status: 400 });
    }

    const pushSub: PushSubscription = {
      userId: userId ?? "anon",
      endpoint: subscription.endpoint,
      kind: "web",
      keys: subscription.keys,
      topics: (topics as TopicId[]) ?? [],
      language: language ?? "ne",
      createdAt: new Date().toISOString(),
    };

    await pushManager.saveSubscription(pushSub);

    // If client sent behavioral topic scores, persist them server-side for targeting
    if (topicScores && typeof topicScores === "object") {
      pushManager.updateSubscriberBehavior(subscription.endpoint, topicScores);
    }

    return NextResponse.json({ success: true, vapidKey: pushManager.getVapidPublicKey() });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    await pushManager.removeSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    vapidPublicKey: pushManager.getVapidPublicKey(),
    subscriberCount: await pushManager.getSubscriptionCount(),
    dailyStats: pushManager.getDailyStats(),
  });
}
