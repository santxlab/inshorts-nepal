// POST /api/cron/prune
//   body: { secret: string }
//
// Daily retention sweep. MongoDB here is Atlas free tier (512 MB) and articles
// were accumulating ~1,100/day with nothing ever deleting them — roughly three
// months from filling the tier and taking the app down.
import { NextRequest, NextResponse } from "next/server";
import { pruneOldData } from "@/lib/retention-service";

const CRON_SECRET = process.env.CRON_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-cron-secret");

export const dynamic = "force-dynamic";
// Deleting tens of thousands of documents in batches takes a while.
export const maxDuration = 300;

async function run(req: NextRequest) {
  const auth = req.headers.get("authorization");
  let secret: string | undefined;
  if (auth?.startsWith("Bearer ")) secret = auth.slice(7);
  else {
    try { secret = (await req.json())?.secret; } catch { /* no body */ }
  }

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pruneOldData();
    if (!result) {
      return NextResponse.json({ error: "db unavailable" }, { status: 503 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/prune]", err);
    return NextResponse.json({ error: "prune failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return run(req); }
export async function GET(req: NextRequest) { return run(req); }
