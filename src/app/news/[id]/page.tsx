import { Metadata } from "next";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { connectDB } from "@/lib/db";
import { ArticleModel } from "@/models/ArticleModel";
import { SummaryModel } from "@/models/SummaryModel";
import { fetchFullArticle } from "@/lib/article-extractor";
import { summarizeArticle } from "@/lib/summary-service";
import { NewsArticle, Category } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org";

// Look up an article first in the in-memory store (fast path), then fall back
// to the persistent MongoDB copy so the page works across restarts + after the
// in-memory cap has evicted the entry.
async function lookupArticle(id: string): Promise<NewsArticle | null> {
  const inMem = store.getAllArticles().find((a) => a.id === id);
  if (inMem) return inMem;
  const conn = await connectDB();
  if (!conn) return null;
  try {
    const doc = await ArticleModel.findOne({ articleId: id }).lean<{
      articleId: string; title: string; summary: string; fullContent?: string;
      imageUrl?: string; sourceUrl: string; sourceName: string; category: string;
      topics?: string[]; language: "ne" | "en"; origin?: "np" | "in" | "global";
      sourceQuality?: number; publishedAt: Date; fetchedAt: Date;
      isApproved: boolean; isBreaking?: boolean; readTimeSeconds?: number; viewCount?: number;
    }>();
    if (!doc) return null;
    return {
      id: doc.articleId,
      title: doc.title,
      summary: doc.summary,
      fullContent: doc.fullContent,
      imageUrl: doc.imageUrl,
      sourceUrl: doc.sourceUrl,
      sourceName: doc.sourceName,
      category: doc.category as Category,
      topics: doc.topics as NewsArticle["topics"],
      language: doc.language,
      origin: doc.origin,
      sourceQuality: doc.sourceQuality,
      publishedAt: doc.publishedAt.toISOString(),
      fetchedAt: doc.fetchedAt.toISOString(),
      isApproved: doc.isApproved,
      isBreaking: doc.isBreaking,
      readTimeSeconds: doc.readTimeSeconds,
      viewCount: doc.viewCount,
    };
  } catch (err) {
    console.error("[news/[id]] mongo fallback failed:", err);
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = await lookupArticle(id);
  if (!article) return { title: "Article not found" };

  const description = article.summary.slice(0, 160);
  const canonical = `${BASE_URL}/news/${article.id}`;

  return {
    title: `${article.title} | InShorts Nepal`,
    description,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url: canonical,
      images: article.imageUrl ? [{ url: article.imageUrl, width: 1200, height: 630, alt: article.title }] : [],
      siteName: "InShorts Nepal",
      publishedTime: article.publishedAt,
      authors: [article.sourceName],
      tags: article.topics ?? [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.imageUrl ? [article.imageUrl] : [],
      site: "@InShortsNepal",
    },
    robots: { index: true, follow: true },
    other: {
      "article:published_time": article.publishedAt,
      "article:author": article.sourceName,
      "article:section": article.category,
    },
  };
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  // Real in-app readers arrive with ?app=1 (added by the mobile openArticle()).
  // We only GENERATE the long summary for them — the public page is SEO-crawled,
  // and letting bots trigger generation would explode token/diamond cost.
  const fromApp = sp.app === "1";
  const article = await lookupArticle(id);
  if (!article) notFound();

  // Full article body FIRST. RSS only gives a short excerpt, so if we don't
  // already have a decent `fullContent` we scrape the publisher page on demand
  // and cache it (in-memory store object + MongoDB) so the next open is instant.
  // Resolving it before the summary means the long summary is built from the
  // real article text, not the stub — so it can actually reach 60–70 words.
  // Threshold sits above the RSS stub size (~300–500 chars) so stubs get
  // upgraded, but below a genuine article so we don't re-scrape long pieces.
  let fullContent = article.fullContent;
  if (!fullContent || fullContent.length < 1000) {
    const scraped = await fetchFullArticle(article.sourceUrl);
    if (scraped && scraped.length > (fullContent?.length ?? 0)) {
      fullContent = scraped;
      // Mutating the looked-up object caches it in the in-memory store (when the
      // hit came from there); the DB write covers the post-eviction path.
      article.fullContent = scraped;
      connectDB()
        .then((conn) => {
          if (conn) {
            return ArticleModel.updateOne(
              { articleId: id },
              { $set: { fullContent: scraped } }
            ).exec();
          }
        })
        .catch(() => { /* best-effort cache */ });
    }
  }

  // Long (60–70 word) AI summary for the full story, built from the full article
  // text resolved above. Cache-first + shared. For app readers we generate on a
  // miss (reaching this page is a deliberate "read full" tap); for everyone else
  // (incl. SEO crawlers) we only show it if already cached.
  let aiSummary: string | null = null;
  try {
    if (fromApp) {
      aiSummary = await summarizeArticle(article, article.language, "long");
    } else {
      const conn = await connectDB();
      if (conn) {
        const s = await SummaryModel.findOne({ articleId: id, lang: article.language, mode: "long" })
          .select({ summary: 1, _id: 0 })
          .lean<{ summary: string }>();
        if (s) aiSummary = s.summary;
      }
    }
  } catch { /* non-fatal */ }

  const canonical = `${BASE_URL}/news/${article.id}`;

  // JSON-LD structured data for Google News
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    image: article.imageUrl ? [article.imageUrl] : [],
    datePublished: article.publishedAt,
    dateModified: article.fetchedAt,
    author: {
      "@type": "Organization",
      name: article.sourceName,
      url: article.sourceUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "InShorts Nepal",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo-app-icon-1024.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: article.language === "ne" ? "ne-NP" : "en-US",
    about: article.topics?.map((t) => ({ "@type": "Thing", name: t })) ?? [],
    isAccessibleForFree: true,
    keywords: article.topics?.join(", "),
  };

  return (
    <>
      {/* globals.css locks `html, body { overflow: hidden }` for the home card
          pager SPA — but this reader is a normal scrolling document. Re-enable
          scrolling just for this route so the full story can be read (fixes the
          "page won't scroll" bug in the in-app browser). */}
      <style dangerouslySetInnerHTML={{ __html: "html,body{overflow:auto !important;height:auto !important;}" }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🇳🇵</span>
            <span className="font-black text-lg">
              <span className="text-white">InShort</span>
              <span className="text-red-500"> Nepal</span>
            </span>
          </a>
          <div className="ml-auto">
            <a
              href="/"
              className="text-xs text-white/50 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all"
            >
              Open App →
            </a>
          </div>
        </header>

        {/* Article */}
        <main className="max-w-2xl mx-auto px-4 py-6">
          {/* Category + time */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase">
              {article.category}
            </span>
            <span className="text-white/40 text-sm">{timeAgo(article.publishedAt)}</span>
            {article.readTimeSeconds && (
              <span className="text-white/30 text-sm">· {Math.ceil(article.readTimeSeconds / 60)} min read</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black leading-tight text-white mb-4">
            {article.title}
          </h1>

          {/* Source */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
            <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm">📰</span>
            <div>
              <p className="text-white/80 text-sm font-semibold">{article.sourceName}</p>
              <time className="text-white/30 text-xs" dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </time>
            </div>
          </div>

          {/* Featured image */}
          {article.imageUrl && (
            <figure className="mb-6 -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full aspect-video object-cover"
              />
              <figcaption className="text-white/30 text-xs text-center mt-2 px-4">
                {article.sourceName}
              </figcaption>
            </figure>
          )}

          {/* AI Summary (Saransh) — shown above the article body when available */}
          {aiSummary && (
            <div className="mb-6 p-4 rounded-2xl bg-red-600/10 border border-red-600/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✨</span>
                <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
                  {article.language === "ne" ? "सारांश" : "Summary"}
                </span>
              </div>
              <p className="text-white text-base leading-relaxed">{aiSummary}</p>
            </div>
          )}

          {/* Article body */}
          <div className="prose prose-invert prose-lg max-w-none">
            {fullContent
              ? fullContent.split("\n\n").map((para, i) => (
                  <p key={i} className="text-white/85 text-lg leading-relaxed mb-4">
                    {para}
                  </p>
                ))
              : (
                <p className="text-white/85 text-lg leading-relaxed mb-4">{article.summary}</p>
              )}
          </div>

          {/* Topics */}
          {article.topics && article.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
              {article.topics.map((t) => (
                <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Read original */}
          <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
            <div>
              <p className="text-white text-sm font-semibold">Read the full story</p>
              <p className="text-white/40 text-xs">{article.sourceName}</p>
            </div>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold flex-shrink-0"
            >
              Read →
            </a>
          </div>

          {/* App CTA */}
          <div className="mt-4 p-4 rounded-2xl nepal-gradient text-white text-center">
            <p className="font-black text-lg mb-1">🇳🇵 InShorts Nepal</p>
            <p className="text-white/80 text-sm mb-3">
              Get the full experience — swipe, audio, polls & more
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 rounded-xl bg-white text-red-600 font-bold text-sm"
            >
              Open App
            </a>
          </div>

          {/* Share buttons */}
          <div className="mt-6 flex gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(article.title + "\n\n" + canonical)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold text-center"
            >
              📱 WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(canonical)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-sky-500 text-white text-sm font-bold text-center"
            >
              𝕏 Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold text-center"
            >
              Facebook
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-white/20 text-xs border-t border-white/5 mt-8">
          <p>© {new Date().getFullYear()} InShorts Nepal · नेपाल इनशर्ट</p>
          <p className="mt-1">
            <a href="/sitemap.xml" className="hover:text-white/40">Sitemap</a>
            {" · "}
            <a href="/" className="hover:text-white/40">Home</a>
          </p>
        </footer>
      </div>
    </>
  );
}
