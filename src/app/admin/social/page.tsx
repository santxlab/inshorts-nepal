"use client";
import { useEffect, useState } from "react";
import {
  Share2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

interface SocialPost {
  id: string;
  platform: string;
  articleId: string;
  articleTitle?: string;
  status: "published" | "failed" | "pending";
  publishedAt?: string;
  errorMessage?: string;
}

interface SocialStats {
  total: number;
  published: number;
  failed: number;
  byPlatform: Record<string, { published: number; failed: number }>;
}

interface Article {
  id: string;
  title: string;
}

type Platform = "facebook" | "instagram" | "twitter";

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "facebook", label: "Facebook", color: "text-blue-400" },
  { id: "instagram", label: "Instagram", color: "text-pink-400" },
  { id: "twitter", label: "Twitter/X", color: "text-cyan-400" },
];

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  failed: "bg-red-500/20 text-red-400 border border-red-500/20",
  pending: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20",
};

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "🇫",
  instagram: "📷",
  twitter: "🐦",
};

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    facebook: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    twitter: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  const style = colors[platform.toLowerCase()] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-1 rounded-md border ${style}`}>
      {PLATFORM_ICONS[platform.toLowerCase()] ?? "🌐"} {platform}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCredWarning, setShowCredWarning] = useState(false);

  // Publish form
  const [articleId, setArticleId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<Record<string, { ok: boolean; message: string }> | null>(null);

  // Article selector
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [useSelector, setUseSelector] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/social/publish");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
      setStats(data.stats ?? null);

      // Check if any posts show credential errors
      const hasCreditError = (data.posts ?? []).some(
        (p: SocialPost) =>
          p.errorMessage?.toLowerCase().includes("credentials not configured") ||
          p.errorMessage?.toLowerCase().includes("access token")
      );
      setShowCredWarning(hasCreditError || data.credentialsWarning);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load social posts");
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch("/api/news?lang=ne&limit=20");
      const data = await res.json();
      setArticles(
        (data.articles ?? []).map((a: { id: string; title: string }) => ({
          id: a.id,
          title: a.title,
        }))
      );
    } catch {
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handlePublish = async () => {
    if (!articleId.trim()) {
      alert("Please enter or select an Article ID");
      return;
    }
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }
    setPublishing(true);
    setPublishResults(null);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: articleId.trim(), platforms: selectedPlatforms }),
      });
      const data = await res.json();
      // Expect data.results: { facebook: { ok, message }, instagram: {...}, ... }
      setPublishResults(data.results ?? {});
      await load();
    } catch (e: unknown) {
      setPublishResults(
        Object.fromEntries(
          selectedPlatforms.map((p) => [p, { ok: false, message: e instanceof Error ? e.message : "Network error" }])
        )
      );
    } finally {
      setPublishing(false);
    }
  };

  const totalPublished = stats?.published ?? posts.filter((p) => p.status === "published").length;
  const totalFailed = stats?.failed ?? posts.filter((p) => p.status === "failed").length;
  const totalPosts = stats?.total ?? posts.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Social Media Publishing</h1>
          <p className="text-gray-500 text-sm">
            Publish breaking news articles to Facebook, Instagram and Twitter/X
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Credentials Warning */}
      {showCredWarning && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm px-4 py-3 rounded-xl mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Social credentials not configured</p>
            <p className="text-yellow-500/70 text-xs mt-0.5">
              Set <code className="font-mono bg-yellow-500/10 px-1 rounded">FACEBOOK_PAGE_ACCESS_TOKEN</code>,{" "}
              <code className="font-mono bg-yellow-500/10 px-1 rounded">INSTAGRAM_ACCESS_TOKEN</code>, and{" "}
              <code className="font-mono bg-yellow-500/10 px-1 rounded">TWITTER_BEARER_TOKEN</code> in your environment variables.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 mb-1">Total Posts</p>
              <p className="text-2xl font-bold text-white">{totalPosts}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 mb-1">Published</p>
              <p className="text-2xl font-bold text-emerald-400">{totalPublished}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
            </div>
            {PLATFORMS.slice(0, 2).map((platform) => {
              const pStats = stats?.byPlatform?.[platform.id];
              return (
                <div key={platform.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <p className={`text-xs mb-1 ${platform.color}`}>{platform.label}</p>
                  <p className="text-2xl font-bold text-white">{pStats?.published ?? 0}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{pStats?.failed ?? 0} failed</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Publish Form */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                <Send className="w-4 h-4 text-red-400" />
                Publish Breaking News
              </h2>
              <p className="text-gray-500 text-xs mb-5">
                Share an article instantly to selected platforms.
              </p>

              {/* Article selector toggle */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setUseSelector(false)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${!useSelector ? "bg-red-600/20 text-red-400" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Paste Article ID
                </button>
                <button
                  onClick={() => {
                    setUseSelector(true);
                    if (articles.length === 0) loadArticles();
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${useSelector ? "bg-red-600/20 text-red-400" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Select Article
                </button>
              </div>

              {!useSelector ? (
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-1">Article ID</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors font-mono"
                    value={articleId}
                    onChange={(e) => setArticleId(e.target.value)}
                    placeholder="Paste article ID here..."
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-1">Select Article</label>
                  <div className="relative">
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors appearance-none pr-8"
                      value={articleId}
                      onChange={(e) => setArticleId(e.target.value)}
                      disabled={loadingArticles}
                    >
                      <option value="">
                        {loadingArticles ? "Loading articles…" : "Select an article…"}
                      </option>
                      {articles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title.length > 60 ? `${a.title.slice(0, 60)}…` : a.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Platform checkboxes */}
              <div className="mb-5">
                <label className="block text-xs text-gray-400 mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedPlatforms.includes(p.id)
                          ? `bg-gray-800 ${p.color} border-current`
                          : "bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      {PLATFORM_ICONS[p.id]} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {publishing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {publishing ? "Publishing…" : "Publish Now"}
              </button>

              {/* Publish Results */}
              {publishResults && (
                <div className="mt-4 space-y-2">
                  {Object.entries(publishResults).map(([platform, result]) => (
                    <div
                      key={platform}
                      className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-xl ${
                        result.ok
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      }`}
                    >
                      {result.ok ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold capitalize">{platform}:</span>{" "}
                        <span className="opacity-80">{result.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-400" />
                Platform Summary
              </h2>
              <div className="space-y-4">
                {PLATFORMS.map((platform) => {
                  const pStats = stats?.byPlatform?.[platform.id] ?? { published: 0, failed: 0 };
                  const total = pStats.published + pStats.failed;
                  const successPct = total > 0 ? Math.round((pStats.published / total) * 100) : 0;
                  return (
                    <div key={platform.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{PLATFORM_ICONS[platform.id]}</span>
                          <span className={`text-sm font-medium ${platform.color}`}>{platform.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-400">{pStats.published} ok</span>
                          <span className="text-red-400">{pStats.failed} failed</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${successPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Posts Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-gray-400" />
              Recent Posts
            </h2>
            {posts.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No posts published yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Platform</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Article</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="py-2 px-3">
                          <PlatformBadge platform={post.platform} />
                        </td>
                        <td className="py-2 px-3 text-gray-300">
                          {post.articleTitle
                            ? post.articleTitle.length > 50
                              ? `${post.articleTitle.slice(0, 50)}…`
                              : post.articleTitle
                            : (
                              <span className="font-mono text-gray-500 text-xs">
                                {post.articleId.slice(0, 20)}…
                              </span>
                            )}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${STATUS_STYLES[post.status]}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-500 text-xs">
                          {post.publishedAt ? timeAgo(post.publishedAt) : "—"}
                        </td>
                        <td className="py-2 px-3 text-red-400 text-xs max-w-[200px]">
                          {post.errorMessage ? (
                            <span title={post.errorMessage}>
                              {post.errorMessage.length > 40
                                ? `${post.errorMessage.slice(0, 40)}…`
                                : post.errorMessage}
                            </span>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Inline SVG for Newspaper icon (not imported from lucide above)
function Newspaper(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}
