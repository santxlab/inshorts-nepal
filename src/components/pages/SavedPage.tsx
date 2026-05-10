"use client";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useState, useEffect } from "react";
import { NewsArticle } from "@/types";
import { getTopicById } from "@/lib/topics-config";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SavedPage() {
  const { prefs, toggleSaved } = useUserPrefs();
  const [savedArticles, setSavedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const isNepali = prefs.language !== "en";

  useEffect(() => {
    // Fetch saved articles from local cache or API
    const fetchSaved = async () => {
      if (prefs.savedArticleIds.length === 0) { setLoading(false); return; }
      try {
        // Try to get from API - for prototype, fetch all and filter
        const res = await fetch("/api/news?lang=ne&limit=100");
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.articles as NewsArticle[]).filter((a) =>
            prefs.savedArticleIds.includes(a.id)
          );
          setSavedArticles(filtered);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchSaved();
  }, [prefs.savedArticleIds]);

  return (
    <div className="flex-1 bg-black overflow-y-auto pb-20">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-white text-2xl font-black mb-1">
          {isNepali ? "🔖 सेव गरिएका" : "🔖 Saved Articles"}
        </h1>
        <p className="text-white/40 text-sm">
          {prefs.savedArticleIds.length} {isNepali ? "लेखहरू" : "articles"}
        </p>
      </div>

      {prefs.savedArticleIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <span className="text-6xl mb-4">📋</span>
          <h2 className="text-white font-bold text-xl mb-2">
            {isNepali ? "अझै केही सेव गरिएको छैन" : "Nothing saved yet"}
          </h2>
          <p className="text-white/40 text-sm">
            {isNepali
              ? "समाचार पढ्दा → स्वाइप गर्नुहोस् सेव गर्न"
              : "Swipe right on any article to save it"}
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="text-white/40 text-sm">{isNepali ? "लोड हुँदैछ..." : "Loading..."}</div>
        </div>
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {savedArticles.map((article) => {
            const topic = article.topics?.[0] ? getTopicById(article.topics[0]) : null;
            return (
              <div key={article.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex gap-3 p-3">
                  {article.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="w-20 h-16 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {topic && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                          style={{ backgroundColor: topic.color }}
                        >
                          {topic.emoji}
                        </span>
                      )}
                      <span className="text-white/40 text-[10px]">{timeAgo(article.publishedAt)}</span>
                    </div>
                    <h3 className="text-white text-sm font-bold leading-snug line-clamp-2 mb-1">
                      {article.title}
                    </h3>
                    <p className="text-white/50 text-xs">{article.sourceName}</p>
                  </div>
                </div>
                <div className="flex border-t border-white/5">
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center py-2 text-white/60 text-xs"
                  >
                    {isNepali ? "पढ्नुहोस्" : "Read"}
                  </a>
                  <button
                    onClick={() => toggleSaved(article.id)}
                    className="flex-1 text-center py-2 text-red-400/70 text-xs border-l border-white/5"
                  >
                    {isNepali ? "हटाउनुहोस्" : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
