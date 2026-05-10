// PATCH /api/push/behavior
// Client sends updated behavioral topic scores so the server can use them
// for behavior-aware push targeting without waiting for a full re-subscribe.
import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";

export async function PATCH(req: NextRequest) {
  try {
    const { endpoint, topicScores } = await req.json();
    if (!endpoint || typeof topicScores !== "object") {
      return NextResponse.json({ error: "endpoint and topicScores required" }, { status: 400 });
    }
    pushManager.updateSubscriberBehavior(endpoint as string, topicScores as Record<string, number>);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
