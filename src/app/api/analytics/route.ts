import { NextRequest, NextResponse } from "next/server";
import { analyticsStore } from "@/lib/analytics-store";
import { AnalyticsEventType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, articleId, campaignId, userId, sessionId, language, province, topic, metadata } = body;

    if (!type || !sessionId) {
      return NextResponse.json({ error: "type and sessionId required" }, { status: 400 });
    }

    const event = analyticsStore.track({
      type: type as AnalyticsEventType,
      articleId,
      campaignId,
      userId,
      sessionId,
      language,
      province,
      topic,
      metadata,
    });

    return NextResponse.json({ success: true, id: event.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as AnalyticsEventType | null;
  const limit = parseInt(searchParams.get("limit") ?? "100");

  if (searchParams.get("dashboard") === "1") {
    return NextResponse.json(analyticsStore.getDashboardStats());
  }

  const events = analyticsStore.getEvents(type ?? undefined, limit);
  return NextResponse.json({ events });
}
