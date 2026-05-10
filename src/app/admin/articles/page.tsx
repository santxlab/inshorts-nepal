"use client";
import { useEffect, useState } from "react";
import {
  Trash2,
  CheckCircle,
  Filter,
  Search,
  Clock,
  Globe,
  RefreshCw,
} from "lucide-react";
import { NewsArticle, Language } from "@/types";
import Image from "next/image";

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [langFilter, setLangFilter] = useState<Language | "all">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/articles");
      const data = await res.json();
      setArticles(data.articles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const action = async (id: string, act: "approve" | "delete") => {
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: act }),
    });
    setArticles((prev) =>
      act === "delete"
        ? prev.filter((a) => a.id !== id)
        : prev.map((a) => (a.id === id ? { ...a, isApproved: true } : a))
    );
  };

  const filtered = articles.filter((a) => {
    if (filter === "pending" && a.isApproved) return false;
    if (filter === "approved" && !a.isApproved) return false;
    if (langFilter !== "all" && a.language !== langFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Articles</h1>
          <p className="text-gray-500 text-sm">{filtered.length} articles</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {(["all", "pending", "approved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Lang filter */}
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {(["all", "en", "ne"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLangFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                langFilter === l
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {l === "all" ? "All" : l === "en" ? "🇬🇧 EN" : "🇳🇵 NE"}
            </button>
          ))}
        </div>
      </div>

      {/* Articles list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <div
              key={article.id}
              className={`flex gap-4 bg-gray-900 border rounded-xl p-4 transition-all hover:border-gray-700 ${
                article.isApproved
                  ? "border-gray-800"
                  : "border-yellow-500/30 bg-yellow-500/5"
              }`}
            >
              {/* Thumbnail */}
              {article.imageUrl && (
                <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                  <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    onError={() => {}}
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          article.language === "ne"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {article.language === "ne" ? "🇳🇵 NE" : "🇬🇧 EN"}
                      </span>
                      <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-md uppercase">
                        {article.category}
                      </span>
                      {!article.isApproved && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium leading-snug line-clamp-2 mb-1">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {article.sourceName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(article.publishedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!article.isApproved && (
                      <button
                        onClick={() => action(article.id, "approve")}
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => action(article.id, "delete")}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Filter className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>No articles match filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
