import { NextRequest, NextResponse } from "next/server";
import { fetchAllSources } from "@/lib/rss-fetcher";
import { verifyToken } from "@/lib/auth";
import { Language } from "@/types";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    // Allow public fetch for dev (remove in production)
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
