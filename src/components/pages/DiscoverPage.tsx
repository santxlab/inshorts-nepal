"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { NewsArticle, TopicId } from "@/types";
import { TOPICS, getTopicById } from "@/lib/topics-config";

function timeAgo(iso: string, isNepali: boolean): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}${isNepali ? "मि" : "m"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${isNepali ? "घ" : "h"}`;
  return `${Math.floor(diff / 86400)}${isNepali ? "दि" : "d"}`;
}

export default function DiscoverPage() {
  const { prefs } = useUserPrefs();
  const isNepali = prefs.language !== "en";

  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [results, setResults] = useState<NewsArticle[]>([]);
  const [searching, setSearching] = useState(false);

  const [trending, setTrending] = useState<NewsArticle[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Run search when debounced query changes
  useEffect(() => {
    if (!debouncedQ) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}&lang=${prefs.language}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => setResults(data.articles ?? []))
      .catch(() => { /* ignore aborted */ })
      .finally(() => setSearching(false));
    return () => ctrl.abort();
  }, [debouncedQ, prefs.language]);

  // Load trending (most-viewed in last 24h) once on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news?lang=${prefs.language}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const list: NewsArticle[] = (data.articles ?? []).filter(
          (a: NewsArticle) => new Date(a.publishedAt).getTime() >= cutoff,
        );
        list.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
        setTrending(list.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingTrending(false); });
    return () => { cancelled = true; };
  }, [prefs.language]);

  const showingResults = debouncedQ.length > 0;

  // Group topics by personalization score so the user's favorites come first
  const orderedTopics = useMemo(() => {
    const scores = prefs.topics ?? [];
    const preferred = new Set(scores);
    return [...TOPICS].sort((a, b) => {
      const aP = preferred.has(a.id) ? 1 : 0;
      const bP = preferred.has(b.id) ? 1 : 0;
      return bP - aP;
    });
  }, [prefs.topics]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur px-4 pt-4 pb-3 border-b border-white/5">
        <div className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isNepali ? "समाचार खोज्नुहोस्…" : "Search news…"}
            className="w-full bg-white/8 text-white text-base rounded-full pl-11 pr-10 py-3 outline-none focus:bg-white/12 placeholder:text-white/35"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">🔍</span>
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-sm"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showingResults ? (
        <SearchResults
          results={results}
          searching={searching}
          query={debouncedQ}
          isNepali={isNepali}
        />
      ) : (
        <BrowseSections
          topics={orderedTopics}
          trending={trending}
          loadingTrending={loadingTrending}
          isNepali={isNepali}
        />
      )}
    </div>
  );
}

function SearchResults({
  results, searching, query, isNepali,
}: {
  results: NewsArticle[];
  searching: boolean;
  query: string;
  isNepali: boolean;
}) {
  if (searching && results.length === 0) {
    return <div className="text-white/45 text-center py-12 text-sm">{isNepali ? "खोज्दै…" : "Searching…"}</div>;
  }
  if (!searching && results.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-5xl mb-3">🔎</div>
        <div className="text-white/80 font-bold mb-1">
          {isNepali ? "कुनै परिणाम भेटिएन" : "No results"}
        </div>
        <div className="text-white/45 text-sm">
          {isNepali ? `"${query}" को लागि कुनै समाचार छैन` : `Nothing matches "${query}"`}
        </div>
      </div>
    );
  }
  return (
    <div className="px-4 py-3 space-y-3">
      <div className="text-white/45 text-xs uppercase tracking-wider">
        {results.length} {isNepali ? "नतिजा" : "results"}
      </div>
      {results.map((a) => (
        <ArticleRow key={a.id} article={a} isNepali={isNepali} />
      ))}
    </div>
  );
}

function BrowseSections({
  topics, trending, loadingTrending, isNepali,
}: {
  topics: typeof TOPICS;
  trending: NewsArticle[];
  loadingTrending: boolean;
  isNepali: boolean;
}) {
  return (
    <div className="pb-6">
      {/* Topics */}
      <section className="px-4 pt-5">
        <h3 className="text-white font-bold text-base mb-3">
          {isNepali ? "विषयहरू" : "Topics"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("inshorts:openTopic", { detail: t.id }));
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/8 hover:bg-white/14 border border-white/10 text-white text-sm font-medium"
            >
              <span className="text-base">{t.emoji}</span>
              <span>{isNepali ? t.labelNe : t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="px-4 pt-7">
        <h3 className="text-white font-bold text-base mb-3">
          {isNepali ? "🔥 अहिले चर्चामा" : "🔥 Trending now"}
        </h3>
        {loadingTrending ? (
          <div className="text-white/40 text-sm py-3">{isNepali ? "लोड हुँदै…" : "Loading…"}</div>
        ) : trending.length === 0 ? (
          <div className="text-white/40 text-sm py-3">
            {isNepali ? "पछिल्लो २४ घण्टामा कुनै ट्रेन्डिङ छैन" : "No trending stories in the last 24h"}
          </div>
        ) : (
          <div className="space-y-3">
            {trending.map((a, i) => (
              <ArticleRow key={a.id} article={a} rank={i + 1} isNepali={isNepali} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ArticleRow({
  article, rank, isNepali,
}: {
  article: NewsArticle;
  rank?: number;
  isNepali: boolean;
}) {
  const topic = article.topics?.[0] ? getTopicById(article.topics[0]) : undefined;
  return (
    <Link
      href={`/news/${article.id}`}
      className="flex gap-3 items-start rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 p-3 transition-colors"
    >
      {rank !== undefined && (
        <div className="text-white/35 font-black text-lg w-5 flex-shrink-0 text-center">{rank}</div>
      )}
      {article.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt=""
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        {topic && (
          <span className="inline-flex items-center gap-1 text-[11px] text-white/60 mb-1">
            <span>{topic.emoji}</span>
            <span>{isNepali ? topic.labelNe : topic.label}</span>
          </span>
        )}
        <div className="text-white text-sm font-semibold leading-snug line-clamp-3">{article.title}</div>
        <div className="text-white/40 text-[11px] mt-1.5 flex items-center gap-2">
          <span>{article.sourceName}</span>
          <span>·</span>
          <span>{timeAgo(article.publishedAt, isNepali)}</span>
        </div>
      </div>
    </Link>
  );
}
