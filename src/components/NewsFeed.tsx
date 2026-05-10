"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import NewsCard from "./NewsCard";
import PollCard from "./PollCard";
import DigestBanner from "./DigestBanner";
import { NewsArticle, TopicId } from "@/types";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { loadBehaviorProfile, personalizeOrder } from "@/lib/behavior";

interface Props {
  selectedTopic: TopicId | null;
}

export default function NewsFeed({ selectedTopic }: Props) {
  const { prefs } = useUserPrefs();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();
  const isNepali = prefs.language !== "en";

  // Map app language to rss language
  const langMap: Record<string, "ne" | "en"> = {
    ne: "ne", en: "en", hi: "ne", mai: "ne", thr: "ne",
    bho: "ne", tam: "ne", baj: "ne", awa: "ne", new: "ne",
  };
  const rssLang = langMap[prefs.language] ?? "ne";

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ lang: rssLang, limit: "40" });
      if (selectedTopic) params.set("topic", selectedTopic);
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const fetched: NewsArticle[] = data.articles ?? [];

      // AI personalization: reorder by behavioral topic scores (client-side)
      // Falls back to chronological order if no behavior data yet
      const profile = loadBehaviorProfile();
      const personalized = personalizeOrder<NewsArticle>(fetched, profile);
      setArticles(personalized);
    } catch {
      setError(isNepali ? "समाचार लोड गर्न सकिएन।" : "Could not load news.");
    } finally {
      setLoading(false);
    }
  }, [rssLang, selectedTopic, isNepali]);

  const triggerRSSFetch = useCallback(async () => {
    if (fetching) return;
    setFetching(true);
    try {
      await fetch("/api/fetch-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: rssLang }),
      });
      await fetchNews();
    } finally {
      setFetching(false);
    }
  }, [fetching, rssLang, fetchNews]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Track current card via scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardH = el.clientHeight;
      const idx = Math.round(el.scrollTop / cardH);
      setCurrentIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Reset on filter change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    setCurrentIndex(0);
  }, [selectedTopic, prefs.language]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black">
        <div className="w-16 h-16 rounded-2xl nepal-gradient flex items-center justify-center shadow-2xl animate-pulse">
          <span className="text-3xl">🇳🇵</span>
        </div>
        <p className="text-gray-300 font-medium text-sm">
          {isNepali ? "समाचार लोड हुँदैछ..." : "Loading news..."}
        </p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-black px-8 text-center">
        <span className="text-6xl">{isOnline ? "📭" : "📵"}</span>
        <h3 className="text-white font-bold text-xl">
          {isNepali ? "समाचार भेटिएन" : "No news found"}
        </h3>
        <p className="text-gray-500 text-sm">
          {error || (isNepali ? "अहिले कुनै समाचार उपलब्ध छैन" : "No articles available right now")}
        </p>
        <button
          onClick={triggerRSSFetch}
          disabled={fetching}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold"
        >
          <span className={fetching ? "animate-spin" : ""}>🔄</span>
          {isNepali ? "ताजा गर्नुहोस्" : "Refresh"}
        </button>
      </div>
    );
  }

  // Insert poll card every 8 articles
  const items: Array<{ type: "article"; data: NewsArticle } | { type: "poll" }> = [];
  articles.forEach((a, i) => {
    items.push({ type: "article", data: a });
    if ((i + 1) % 8 === 0) items.push({ type: "poll" });
  });

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
      {/* Digest banner (above scroll, morning/evening only) */}
      <DigestBanner articleCount={articles.length} />

      {/* Article counter + refresh */}
      <div className="absolute top-0 right-0 z-20 flex items-center gap-2 p-2">
        <span className="text-[10px] text-white/30 bg-black/50 px-2 py-1 rounded-full">
          {currentIndex + 1} / {items.length}
        </span>
        <button
          onClick={triggerRSSFetch}
          disabled={fetching}
          className="flex items-center gap-1 px-2 py-1 bg-black/50 text-white/50 rounded-full text-xs border border-white/10 disabled:opacity-40"
        >
          <span className={fetching ? "animate-spin" : ""}>🔄</span>
          {fetching ? "..." : isNepali ? "ताजा" : "Refresh"}
        </button>
      </div>

      {/* Offline chip */}
      {!isOnline && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1.5 bg-yellow-900/80 text-yellow-300 text-xs px-3 py-1.5 rounded-full">
            📵 {isNepali ? "अफलाइन" : "Offline"}
          </div>
        </div>
      )}

      {/* Scroll container */}
      <div ref={scrollRef} className="news-scroll flex-1">
        {items.map((item, i) =>
          item.type === "poll" ? (
            <PollCard key={`poll-${i}`} />
          ) : (
            <NewsCard
              key={item.data.id}
              article={item.data}
              index={i}
              total={items.length}
              isActive={currentIndex === i}
            />
          )
        )}
      </div>
    </div>
  );
}

function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}
