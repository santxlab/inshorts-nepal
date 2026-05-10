import { NextRequest, NextResponse } from "next/server";
import { adStore } from "@/lib/ad-store";
import { analyticsStore } from "@/lib/analytics-store";

export async function POST(req: NextRequest) {
  try {
    const { campaignId, userId, sessionId } = await req.json();
    if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

    adStore.recordImpression(campaignId, !!userId);
    analyticsStore.track({
      type: "sponsored_impression",
      campaignId,
      userId,
      sessionId: sessionId ?? "anon",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
