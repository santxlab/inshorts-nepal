import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";
import { InsightShareModel } from "@/models/InsightShareModel";
import { connectDB } from "@/lib/db";

function authUser(req: NextRequest): { uid: string; name: string } | null {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = userStore.verifyToken(token);
  if (!payload) return null;
  return { uid: payload.id, name: payload.name };
}

// POST /api/insights/share
// Body: { weekId: string, event: "share" | "click" | "install" }
// For "click" and "install" events the user may be anonymous (no JWT required).
export async function POST(req: NextRequest) {
  await connectDB();

  let body: { weekId?: string; event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { weekId, event } = body;
  if (!weekId || !event) {
    return NextResponse.json({ error: "weekId and event required" }, { status: 400 });
  }
  if (!["share", "click", "install"].includes(event)) {
    return NextResponse.json({ error: "event must be share|click|install" }, { status: 400 });
  }

  // Shares require auth (we need to know WHO shared)
  if (event === "share") {
    const user = authUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    await InsightShareModel.findOneAndUpdate(
      { weekId, userId: user.uid },
      { $inc: { shares: 1 }, $setOnInsert: { userName: user.name } },
      { upsert: true, new: true },
    );
    return NextResponse.json({ ok: true });
  }

  // Clicks / installs: carry sharedByUserId in the request body (from deeplink param)
  const { sharedByUserId } = body as { sharedByUserId?: string };

  if (sharedByUserId) {
    const field = event === "click" ? "clicks" : "installs";
    await InsightShareModel.findOneAndUpdate(
      { weekId, userId: sharedByUserId },
      { $inc: { [field]: 1 } },
      { upsert: true, new: true },
    );
  }

  return NextResponse.json({ ok: true });
}
