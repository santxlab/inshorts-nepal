import { NextRequest, NextResponse } from "next/server";
import { socialPublisher } from "@/lib/social-publisher";
import { store } from "@/lib/store";
import { SocialPlatform } from "@/types";
import { analyticsStore } from "@/lib/analytics-store";
import { verifyToken } from "@/lib/auth";

function isAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get("admin_token")?.value;
  if (cookie && verifyToken(cookie)) return true;
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  if (bearer && verifyToken(bearer)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { articleId, platforms } = await req.json();
    if (!articleId || !platforms?.length) {
      return NextResponse.json({ error: "articleId and platforms required" }, { status: 400 });
    }

    const allArticles = store.getAllArticles();
    const article = allArticles.find((a) => a.id === articleId);
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    const posts = await socialPublisher.publish(article, platforms as SocialPlatform[]);

    // Track in analytics
    platforms.forEach((platform: SocialPlatform) => {
      analyticsStore.track({
        type: "social_post",
        articleId,
        sessionId: "admin",
        metadata: { platform, status: posts.find((p) => p.platform === platform)?.status ?? "unknown" },
      });
    });

    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const posts = socialPublisher.getPosts();
  const stats = socialPublisher.getStats();
  return NextResponse.json({ posts, stats });
}
