/**
 * Scheduled push notification endpoint
 * Called by server cron jobs for morning digest, evening brief, and breaking news
 *
 * POST /api/push/scheduled
 * Body: { type: "morning" | "evening" | "breaking", secret: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { pushManager } from "@/lib/push-manager";
import { store } from "@/lib/store";

const CRON_SECRET = process.env.CRON_SECRET ?? "inshorts-cron-2026";

export async function POST(req: NextRequest) {
  try {
    const { type, secret, language } = await req.json();

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lang = (language as "ne" | "en") ?? "ne";

    if (type === "morning") {
      // Morning digest — top 3 recent articles
      const articles = store.getArticles(lang).slice(0, 3);
      const headline = articles[0];
      const title = lang === "ne"
        ? "☀️ सुप्रभात! आजका मुख्य समाचार"
        : "☀️ Good Morning! Today's Top News";
      const body = headline
        ? headline.title
        : (lang === "ne" ? "InShorts Nepal मा आजका ताजा समाचार पढ्नुहोस्।" : "Read today's fresh news on InShorts Nepal.");

      const result = await pushManager.sendToSubscribers(
        { title, body, url: "/", tag: "morning-digest", icon: "/icons/icon-192.png" },
        { filter: { language: lang === "ne" ? undefined : lang } }
      );
      return NextResponse.json({ success: true, type: "morning", ...result });
    }

    if (type === "evening") {
      const articles = store.getArticles(lang).slice(0, 1);
      const headline = articles[0];
      const title = lang === "ne"
        ? "🌙 साँझको समाचार संक्षेप"
        : "🌙 Evening News Brief";
      const body = headline
        ? headline.title
        : (lang === "ne" ? "आजका महत्वपूर्ण घटनाहरू हेर्नुहोस्।" : "Catch up on today's important events.");

      const result = await pushManager.sendToSubscribers(
        { title, body, url: "/", tag: "evening-brief", icon: "/icons/icon-192.png" },
        { filter: { language: lang === "ne" ? undefined : lang } }
      );
      return NextResponse.json({ success: true, type: "evening", ...result });
    }

    if (type === "breaking") {
      // Find breaking articles published in last 30 minutes
      const now = Date.now();
      const breakingArticles = store.getArticles(lang).filter(a =>
        a.isBreaking && (now - new Date(a.publishedAt).getTime()) < 30 * 60 * 1000
      );

      if (breakingArticles.length === 0) {
        return NextResponse.json({ success: true, type: "breaking", sent: 0, message: "No fresh breaking news" });
      }

      const article = breakingArticles[0];
      const title = lang === "ne" ? "🚨 ब्रेकिङ न्युज" : "🚨 Breaking News";
      const result = await pushManager.sendToSubscribers(
        {
          title,
          body: article.title,
          url: `/news/${article.id}`,
          tag: `breaking-${article.id}`,
          icon: "/icons/icon-192.png",
        },
        { filter: {} }
      );
      return NextResponse.json({ success: true, type: "breaking", article: article.id, ...result });
    }

    if (type === "daily") {
      // Daily fresh news digest — top article from last 24h
      const articles = store.getArticles(lang)
        .filter(a => Date.now() - new Date(a.publishedAt).getTime() < 24 * 60 * 60 * 1000)
        .slice(0, 1);
      const article = articles[0];
      const title = lang === "ne" ? "📰 आजका ताजा समाचार" : "📰 Today's Fresh News";
      const body = article
        ? article.title
        : (lang === "ne" ? "InShorts Nepal मा नयाँ समाचार उपलब्ध छ।" : "New news available on InShorts Nepal.");

      const result = await pushManager.sendToSubscribers(
        { title, body, url: "/", tag: "daily-digest", icon: "/icons/icon-192.png" },
        { filter: {} }
      );
      return NextResponse.json({ success: true, type: "daily", ...result });
    }

    return NextResponse.json({ error: "Invalid type. Use: morning | evening | breaking | daily" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
