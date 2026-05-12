"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import NewsCard from "./NewsCard";
import PollCard from "./PollCard";
import DigestBanner from "./DigestBanner";
import { NewsArticle, TopicId, LANGUAGE_CONFIG } from "@/types";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { loadBehaviorProfile, personalizeOrder } from "@/lib/behavior";
import { recordSwipe } from "@/lib/engagement";

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
  const autoFetchedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state for live follow-finger feel
  const [dragY, setDragY] = useState(0);

  // Touch tracking refs
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isVerticalSwipe = useRef(false);
  const isNavigating = useRef(false);

  const isOnline = useOnlineStatus();
  const isNepali = prefs.language !== "en";

  // Use LANGUAGE_CONFIG as single source of truth for RSS feed language mapping
  const rssLang = LANGUAGE_CONFIG[prefs.language]?.rssLang ?? "ne";

  // ── Data fetching ──────────────────────────────────────────
  const fetchNews = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ lang: rssLang, limit: "60" });
      if (selectedTopic) params.set("topic", selectedTopic);
      const res = await fetch(`/api/news?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const fetched: NewsArticle[] = data.articles ?? [];
      const profile = loadBehaviorProfile();
      const personalized = personalizeOrder<NewsArticle>(fetched, profile);
      setArticles(personalized);

      // If server says it's fetching more in background, poll after 8s
      if (data.fetchingMore && fetched.length < 20) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(() => fetchNews(true), 8000);
      }
    } catch {
      setError(isNepali ? "समाचार लोड गर्न सकिएन।" : "Could not load news.");
    } finally {
      if (!silent) setLoading(false);
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

  // Cleanup poll timer
  useEffect(() => {
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, []);

  // Reset to top when filter or language changes
  useEffect(() => {
    setCurrentIndex(0);
    setDragY(0);
    autoFetchedRef.current = false;
  }, [selectedTopic, prefs.language]);

  // ── Auto-fetch more when near end of feed ─────────────────
  useEffect(() => {
    if (articles.length === 0) return;
    const remaining = articles.length - currentIndex;
    // When fewer than 8 cards left, silently fetch more
    if (remaining <= 8 && !fetching && !autoFetchedRef.current) {
      autoFetchedRef.current = true;
      fetch("/api/fetch-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: rssLang }),
      })
        .then(() => fetchNews(true))
        .catch(() => {})
        .finally(() => { autoFetchedRef.current = false; });
    }
  }, [currentIndex, articles.length, fetching, rssLang, fetchNews]);

  // ── Navigation ─────────────────────────────────────────────
  const navigateTo = useCallback((index: number, total: number) => {
    if (isNavigating.current) return;
    const clamped = Math.max(0, Math.min(total - 1, index));
    if (clamped === currentIndex) return;
    isNavigating.current = true;
    setCurrentIndex(clamped);
    recordSwipe(); // track for engagement prompts
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [currentIndex]);

  // ── Touch handlers (vertical swipe = navigate, horizontal = card actions) ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    isVerticalSwipe.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    const dx = e.touches[0].clientX - touchStartX.current;

    // Lock swipe direction after initial movement
    if (!isVerticalSwipe.current && (Math.abs(dy) > 8 || Math.abs(dx) > 8)) {
      isVerticalSwipe.current = Math.abs(dy) > Math.abs(dx);
    }

    if (isVerticalSwipe.current) {
      // Rubber-band at edges
      setDragY(dy);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, totalItems: number) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dt = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dy) / Math.max(dt, 1); // px/ms

    setDragY(0);
    touchStartY.current = null;
    touchStartX.current = null;

    if (!isVerticalSwipe.current) return;

    // Fast flick needs less distance
    const threshold = velocity > 0.4 ? 25 : 55;

    if (dy < -threshold) {
      navigateTo(currentIndex + 1, totalItems);
    } else if (dy > threshold) {
      navigateTo(currentIndex - 1, totalItems);
    }
  }, [currentIndex, navigateTo]);

  // ── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 relative overflow-hidden bg-[#0f0f0f]">
        {/* Skeleton card */}
        <div className="absolute inset-0 flex flex-col animate-pulse">
          {/* Image skeleton */}
          <div className="flex-shrink-0 bg-white/8" style={{ height: "52%" }} />
          {/* Content skeleton */}
          <div className="flex-1 p-4 flex flex-col gap-3 pt-4">
            <div className="flex gap-2 items-center">
              <div className="h-3 w-16 bg-white/10 rounded-full" />
              <div className="h-3 w-10 bg-white/6 rounded-full" />
            </div>
            <div className="h-5 w-full bg-white/12 rounded-lg" />
            <div className="h-5 w-4/5 bg-white/10 rounded-lg" />
            <div className="h-5 w-3/5 bg-white/8 rounded-lg" />
            <div className="mt-1 space-y-2">
              <div className="h-3 w-full bg-white/7 rounded" />
              <div className="h-3 w-full bg-white/6 rounded" />
              <div className="h-3 w-2/3 bg-white/5 rounded" />
            </div>
            <div className="mt-auto flex gap-2 pt-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex-1 h-10 bg-white/6 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        {/* Loading label */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
            <div className="w-3 h-3 rounded-full nepal-gradient animate-pulse" />
            <span className="text-white/60 text-xs">
              {isNepali ? "समाचार लोड हुँदैछ..." : "Loading news..."}
            </span>
          </div>
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

  // Build item list: article + poll every 8 — memoized so counter is always in sync
  const items = useMemo(() => {
    const list: Array<{ type: "article"; data: NewsArticle; key: string } | { type: "poll"; key: string }> = [];
    articles.forEach((a, i) => {
      list.push({ type: "article", data: a, key: a.id });
      if ((i + 1) % 8 === 0) list.push({ type: "poll", key: `poll-${i}` });
    });
    return list;
  }, [articles]);

  return (
    <div
      className="flex-1 relative overflow-hidden bg-black"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={(e) => handleTouchEnd(e, items.length)}
    >
      {/* Digest banner (above cards) */}
      <DigestBanner articleCount={articles.length} />

      {/* Counter + refresh */}
      <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
        <span className="text-[10px] text-white/40 bg-black/60 px-2 py-1 rounded-full font-medium">
          {currentIndex + 1} / {items.length}
        </span>
        <button
          onClick={triggerRSSFetch}
          disabled={fetching}
          className="flex items-center gap-1 px-2 py-1 bg-black/60 text-white/60 rounded-full text-xs border border-white/15 disabled:opacity-40"
        >
          <span className={fetching ? "animate-spin" : ""}>🔄</span>
          {fetching ? "..." : isNepali ? "ताजा" : "Refresh"}
        </button>
      </div>

      {/* "Loading more" indicator when auto-fetching near end */}
      {autoFetchedRef.current && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-black/70 text-white/70 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {isNepali ? "थप समाचार लोड..." : "Loading more..."}
          </div>
        </div>
      )}

      {/* Offline chip */}
      {!isOnline && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-1.5 bg-yellow-900/80 text-yellow-300 text-xs px-3 py-1.5 rounded-full">
            📵 {isNepali ? "अफलाइन" : "Offline"}
          </div>
        </div>
      )}

      {/* ── Card pager ────────────────────────────────────────
          Each card is absolute inset-0. We translateY by offset * 100%
          (% is relative to the element itself = container height). ──── */}
      {items.map((item, i) => {
        const offset = i - currentIndex;

        // Only render current card ± 2 for performance
        if (Math.abs(offset) > 2) return null;

        // Compute per-card translateY
        const baseY = offset * 100; // %
        const resistanceFactor = 0.2;
        const extraY = isVerticalSwipe.current ? dragY * resistanceFactor : 0;
        const transformValue = `calc(${baseY}% + ${extraY}px)`;

        return (
          <div
            key={item.key}
            className="absolute inset-0"
            style={{
              transform: `translateY(${transformValue})`,
              transition: dragY !== 0 ? "none" : "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              willChange: "transform",
              pointerEvents: offset === 0 ? "auto" : "none",
            }}
          >
            {item.type === "poll" ? (
              <PollCard />
            ) : (
              <NewsCard
                article={item.data}
                index={i}
                total={items.length}
                isActive={currentIndex === i}
              />
            )}
          </div>
        );
      })}
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
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
