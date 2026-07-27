// POST /api/diamonds/spend
//   body: { subjectId, articleId }
//
// Charges SUMMARY_COST (5💎) to unlock one article's summary — ONCE per
// (subject, article). Re-opening an already-unlocked article returns
// charged:false, unlocked:true (free). Insufficient balance returns 402 with
// unlocked:false so the app can show a paywall instead of the summary.
//
// This is the gate the mobile app calls BEFORE requesting /api/summary: only a
// successful unlock (charged or previously-owned) should reveal the summary.
import { NextRequest, NextResponse } from "next/server";
import { spendForArticle } from "@/lib/diamond-service";
import { userStore } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { subjectId?: string; articleId?: string };
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
  const articleId = (body.articleId || "").trim();
  if (!subjectId || !articleId) {
    return NextResponse.json({ error: "subjectId and articleId required" }, { status: 400 });
  }

  if (authenticatedSubjectId && body.subjectId && body.subjectId !== authenticatedSubjectId) {
    return NextResponse.json({ error: "Cannot spend for another user" }, { status: 403 });
  }

  try {
    const result = await spendForArticle(subjectId, articleId);

    if (result.reason === "db_unavailable") {
      return NextResponse.json({ error: "wallet unavailable", ...result }, { status: 503 });
    }
    if (result.reason === "insufficient") {
      // 402 Payment Required — app shows "not enough diamonds" paywall.
      return NextResponse.json(result, { status: 402 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[diamonds/spend] error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
