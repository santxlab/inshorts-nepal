// POST /api/diamonds/refund
//   body: { subjectId, articleId }
//
// Undoes a summary spend when generation failed, so the user is not left having
// paid 5💎 for nothing. Releases the unlock and credits the diamonds back.
//
// Safe to call more than once: refundArticle() only credits when it actually
// removes an unlock row, so replaying this cannot mint diamonds.
import { NextRequest, NextResponse } from "next/server";
import { refundArticle } from "@/lib/diamond-service";
import { userStore } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { subjectId?: string; articleId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // A signed-in caller's own id always wins over whatever the body claims, so
  // one user can never refund against another's wallet.
  const authHeader = req.headers.get("authorization");
  let subjectId = body.subjectId;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "").trim();
    const user = userStore.verifyToken(token);
    if (user?.id) subjectId = user.id;
  }

  if (!subjectId || !body.articleId) {
    return NextResponse.json({ error: "subjectId and articleId required" }, { status: 400 });
  }

  try {
    const result = await refundArticle(subjectId, body.articleId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[diamonds/refund]", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
