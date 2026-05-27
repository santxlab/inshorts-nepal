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

// Remember breaking stories already pushed, so the 15-min cron doesn't re-send
// the same article while it's still inside the 30-min freshness window.
// (In-memory; resets on restart — acceptable for time-sensitive alerts.)
const sentBreakingIds = new Set<string>();

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
        {
          title, body,
          url: headline ? `/news/${headline.id}` : "/",
          tag: "morning-digest",
          icon: "/icons/icon-192.png",
          articleId: headline?.id,
          sourceUrl: headline?.sourceUrl,
          language: lang,
        },
        { filter: { language: lang }, isBreaking: false }
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
        {
          title, body,
          url: headline ? `/news/${headline.id}` : "/",
          tag: "evening-brief",
          icon: "/icons/icon-192.png",
          articleId: headline?.id,
          sourceUrl: headline?.sourceUrl,
          language: lang,
        },
        { filter: { language: lang } }
      );
      return NextResponse.json({ success: true, type: "evening", ...result });
    }

    if (type === "breaking") {
      // Find breaking articles published in last 30 minutes
      const now = Date.now();
      const breakingArticles = store.getArticles(lang).filter(a =>
        a.isBreaking && (now - new Date(a.publishedAt).getTime()) < 30 * 60 * 1000
      );

      // Skip stories we've already alerted on within this freshness window.
      const fresh = breakingArticles.find((a) => !sentBreakingIds.has(a.id));
      if (!fresh) {
        return NextResponse.json({ success: true, type: "breaking", sent: 0, message: "No new breaking news" });
      }

      const article = fresh;
      sentBreakingIds.add(article.id);
      // Keep the set from growing unbounded over a long uptime.
      if (sentBreakingIds.size > 500) {
        sentBreakingIds.delete(sentBreakingIds.values().next().value as string);
      }
      const title = lang === "ne" ? "🚨 ब्रेकिङ न्युज" : "🚨 Breaking News";
      const result = await pushManager.sendToSubscribers(
        {
          title,
          body: article.title,
          url: `/news/${article.id}`,
          tag: `breaking-${article.id}`,
          icon: "/icons/icon-192.png",
          articleId: article.id,
          sourceUrl: article.sourceUrl,
          language: lang,
        },
        { filter: { language: lang }, isBreaking: true }
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
