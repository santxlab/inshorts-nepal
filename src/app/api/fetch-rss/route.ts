import { NextRequest, NextResponse } from "next/server";
import { fetchAllSources } from "@/lib/rss-fetcher";
import { verifyToken } from "@/lib/auth";
import { Language } from "@/types";

// Simple in-memory rate limit: allow public fetch at most every 10 minutes
let lastPublicFetch = 0;
const PUBLIC_FETCH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  const isAdmin = token && !!verifyToken(token);

  if (!isAdmin) {
    // Public (app) fetch — rate limited
    const now = Date.now();
    if (now - lastPublicFetch < PUBLIC_FETCH_INTERVAL) {
      return NextResponse.json({
        success: true,
        message: "Rate limited — using cached articles",
        rateLimited: true,
      });
    }
    lastPublicFetch = now;
  }

  const body = await req.json().catch(() => ({}));
  const language = body.language as Language | undefined;

  const result = await fetchAllSources(language);
  return NextResponse.json({
    success: true,
    ...result,
    message: `Fetched ${result.added} new articles from ${result.sources} sources`,
  });
}
