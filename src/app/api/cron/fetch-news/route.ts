import { NextRequest, NextResponse } from "next/server";
import { fetchAllSources } from "@/lib/rss-fetcher";

// Vercel Cron Job — runs every 30 minutes
// Vercel automatically calls this with a valid authorization header
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ne, en] = await Promise.allSettled([
    fetchAllSources("ne"),
    fetchAllSources("en"),
  ]);

  const neResult = ne.status === "fulfilled" ? ne.value : { added: 0, sources: 0 };
  const enResult = en.status === "fulfilled" ? en.value : { added: 0, sources: 0 };

  return NextResponse.json({
    success: true,
    ne: neResult,
    en: enResult,
    total: neResult.added + enResult.added,
    timestamp: new Date().toISOString(),
  });
}
