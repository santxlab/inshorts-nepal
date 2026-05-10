import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";
import { TopicId } from "@/types";

export async function POST(req: NextRequest) {
  try {
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

export async function GET() {
  return NextResponse.json({ logs: pushManager.getLogs() });
}
