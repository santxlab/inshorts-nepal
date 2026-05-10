import { NextRequest, NextResponse } from "next/server";
import { referralStore } from "@/lib/referral-store";
import { analyticsStore } from "@/lib/analytics-store";

export async function POST(req: NextRequest) {
  try {
    const { code, eventType, deviceId, userId, sessionId } = await req.json();
    if (!code || !eventType) {
      return NextResponse.json({ error: "code and eventType required" }, { status: 400 });
    }

    // Get real IP for fraud detection
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";

    const result = referralStore.trackEvent(code, eventType, { deviceId, ip, userId, sessionId });

    // Track in analytics
    analyticsStore.track({
      type: "referral_click",
      userId,
      sessionId: sessionId ?? "anon",
      metadata: { code, eventType, reward: result.reward },
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
