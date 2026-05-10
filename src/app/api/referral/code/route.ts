import { NextRequest, NextResponse } from "next/server";
import { referralStore } from "@/lib/referral-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const code = searchParams.get("code");

  if (code) {
    const ref = referralStore.getCode(code);
    if (!ref) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    // Don't expose userId for privacy
    return NextResponse.json({ code: ref.code, isActive: ref.isActive });
  }

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  // For this prototype, userName is inferred from userId; in prod pass it
  const ref = referralStore.getOrCreateCode(userId, `User-${userId.slice(-4)}`);
  return NextResponse.json(ref);
}
