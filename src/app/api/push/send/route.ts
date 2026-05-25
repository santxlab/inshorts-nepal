import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";
import { verifyToken } from "@/lib/auth";
import { TopicId } from "@/types";

// Allow either a logged-in admin (cookie) or a server/automation caller (secret).
function isAuthorized(req: NextRequest): boolean {
  const token = req.cookies.get("admin_token")?.value;
  if (token && verifyToken(token)) return true;
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "inshorts-cron-2026";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { title, body, url, topics, language, articleId } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 });
    }

    const result = await pushManager.sendToSubscribers(
      { title, body, url: url ?? "/", tag: articleId ? `article-${articleId}` : undefined },
      { filter: { topics: topics as TopicId[], language } }
    );

    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ logs: pushManager.getLogs() });
}
