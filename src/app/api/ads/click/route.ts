import { NextRequest, NextResponse } from "next/server";
import { adStore } from "@/lib/ad-store";
import { analyticsStore } from "@/lib/analytics-store";

export async function POST(req: NextRequest) {
  try {
    const { campaignId, userId, sessionId } = await req.json();
    if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

    adStore.recordClick(campaignId);
    analyticsStore.track({
      type: "sponsored_click",
      campaignId,
      userId,
      sessionId: sessionId ?? "anon",
    });

    const campaign = adStore.getById(campaignId);
    return NextResponse.json({ success: true, landingUrl: campaign?.landingUrl });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
