// POST /api/diamonds/earn
//   body: { subjectId, action, registered? }
//
// Credits engagement diamonds for a recognised action, CLAMPED to the daily cap
// (10 anon / 100 registered). The reward amount for each action is decided
// HERE on the server — the client only names the action, it can never claim an
// arbitrary number of diamonds. Once today's cap is hit, further earns return
// granted:0, cappedOut:true (and the balance is unchanged).
//
// Referral bonuses are NOT earnable through this endpoint — they bypass the cap
// and are credited server-side from the referral attribution flow.
import { NextRequest, NextResponse } from "next/server";
import { earn } from "@/lib/diamond-service";
import { userStore } from "@/lib/user-store";

export const dynamic = "force-dynamic";

// Server-authoritative reward table. Unknown actions earn nothing.
const ENGAGEMENT_REWARDS: Record<string, number> = {
  poll_answer: 5,   // answering the daily poll (matches the legacy client value)
  article_read: 1,  // reading a full story
  share: 2,         // sharing an article
  daily_open: 2,    // first app open of the day
};

export async function POST(req: NextRequest) {
  let body: { subjectId?: string; action?: string; registered?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  let authenticatedSubjectId: string | null = null;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "").trim();
    const user = userStore.verifyToken(token);
    if (user?.id) authenticatedSubjectId = user.id;
  }

  const subjectId = authenticatedSubjectId ?? (body.subjectId || "").trim();
  const action = (body.action || "").trim();
  if (!subjectId || !action) {
    return NextResponse.json({ error: "subjectId and action required" }, { status: 400 });
  }

  if (authenticatedSubjectId && body.subjectId && body.subjectId !== authenticatedSubjectId) {
    return NextResponse.json({ error: "Cannot earn for another user" }, { status: 403 });
  }

  const amount = ENGAGEMENT_REWARDS[action];
  if (amount == null) {
    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  }

  try {
    const result = await earn(subjectId, amount, {
      registered: typeof body.registered === "boolean" ? body.registered : !!authenticatedSubjectId,
      kind: "engagement",
      // Guests are limited to a few paid polls a day — polls pay 5, so they
      // would otherwise consume the whole allowance before any reading.
      isPoll: action === "poll_answer",
    });
    if (result.reason === "db_unavailable") {
      return NextResponse.json({ error: "wallet unavailable", ...result }, { status: 503 });
    }
    return NextResponse.json({ action, ...result });
  } catch (err) {
    console.error("[diamonds/earn] error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
