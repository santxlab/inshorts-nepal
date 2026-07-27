// GET  /api/diamonds?subjectId=<deviceId|userId>&registered=0|1
//   Returns the server-authoritative wallet for a subject. Creates a
//   zero-balance row on first sight. `registered` (optional) bumps the tier so
//   the daily cap reflects 100 once a user has signed in.
//
// The mobile app treats this response as the single source of truth for the
// balance shown in the UI — it never trusts its own local count.
import { NextRequest, NextResponse } from "next/server";
import { getWallet } from "@/lib/diamond-service";
import { userStore } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectId = (searchParams.get("subjectId") || searchParams.get("deviceId") || "").trim();
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId required" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "").trim();
    const user = userStore.verifyToken(token);
    if (user && user.id) {
      return NextResponse.json(await getWallet(user.id, true));
    }
  }

  const registeredParam = searchParams.get("registered");
  const registered = registeredParam == null ? undefined : registeredParam === "1" || registeredParam === "true";

  const wallet = await getWallet(subjectId, registered);
  if (!wallet) {
    return NextResponse.json({ error: "wallet unavailable" }, { status: 503 });
  }
  return NextResponse.json(wallet);
}
