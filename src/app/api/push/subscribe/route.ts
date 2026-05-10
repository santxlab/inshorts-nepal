import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";
import { PushSubscription, TopicId } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId, topics, language, topicScores } = body;

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "subscription endpoint required" }, { status: 400 });
    }

    const pushSub: PushSubscription = {
      userId: userId ?? "anon",
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      topics: (topics as TopicId[]) ?? [],
      language: language ?? "ne",
      createdAt: new Date().toISOString(),
    };

    pushManager.saveSubscription(pushSub);

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
    pushManager.removeSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    vapidPublicKey: pushManager.getVapidPublicKey(),
    subscriberCount: pushManager.getSubscriptionCount(),
    dailyStats: pushManager.getDailyStats(),
  });
}
