"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Eye,
  Share2,
  Bell,
  Megaphone,
  MousePointerClick,
  Link2,
  UserPlus,
  Gem,
  FileText,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  BarChart2,
} from "lucide-react";

interface DailyTrend {
  date: string;
  views: number;
}

interface TopArticle {
  id: string;
  views: number;
}

interface TopTopic {
  name: string;
  views: number;
}

interface AdStat {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface SocialStat {
  platform: string;
  posts: number;
}

interface AnalyticsData {
  dau?: number;
  mau?: number;
  totalViewsToday?: number;
  readCompletionRate?: number;
  totalShares?: number;
  notificationOpens?: number;
  sponsoredImpressions?: number;
  sponsoredCTR?: number;
  referralClicks?: number;
  signups?: number;
  gemsIssued?: number;
  socialPosts?: number;
  dailyTrend?: DailyTrend[];
  topArticles?: TopArticle[];
  topTopics?: TopTopic[];
  adStats?: AdStat[];
  socialStats?: SocialStat[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = "red",
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  const colors: Record<string, string> = {
    red: "text-red-400 bg-red-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    orange: "text-orange-400 bg-orange-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    pink: "text-pink-400 bg-pink-500/10",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const trend = data?.dailyTrend ?? [];
  const maxViews = trend.length > 0 ? Math.max(...trend.map((d) => d.views), 1) : 1;

  const topTopics = data?.topTopics ?? [];
  const maxTopicViews = topTopics.length > 0 ? Math.max(...topTopics.map((t) => t.views), 1) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Live engagement metrics — auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-600">Last: {lastRefresh}</span>
          )}
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Row 1: User & Views */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard icon={Users} label="DAU" value={(data?.dau ?? 0).toLocaleString()} color="blue" />
            <StatCard icon={TrendingUp} label="MAU" value={(data?.mau ?? 0).toLocaleString()} color="purple" />
            <StatCard icon={Eye} label="Total Views Today" value={(data?.totalViewsToday ?? 0).toLocaleString()} color="green" />
            <StatCard icon={BarChart2} label="Read Completion Rate" value={`${(data?.readCompletionRate ?? 0).toFixed(1)}%`} color="yellow" />
          </div>

          {/* Row 2: Engagement */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard icon={Share2} label="Total Shares" value={(data?.totalShares ?? 0).toLocaleString()} color="cyan" />
            <StatCard icon={Bell} label="Notification Opens" value={(data?.notificationOpens ?? 0).toLocaleString()} color="orange" />
            <StatCard icon={Megaphone} label="Sponsored Impressions" value={(data?.sponsoredImpressions ?? 0).toLocaleString()} color="red" />
            <StatCard icon={MousePointerClick} label="Sponsored CTR" value={`${(data?.sponsoredCTR ?? 0).toFixed(2)}%`} color="pink" />
          </div>

          {/* Row 3: Growth */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Link2} label="Referral Clicks" value={(data?.referralClicks ?? 0).toLocaleString()} color="blue" />
            <StatCard icon={UserPlus} label="Signups" value={(data?.signups ?? 0).toLocaleString()} color="green" />
            <StatCard icon={Gem} label="Gems Issued" value={(data?.gemsIssued ?? 0).toLocaleString()} color="purple" />
            <StatCard icon={FileText} label="Social Posts" value={(data?.socialPosts ?? 0).toLocaleString()} color="yellow" />
          </div>

          {/* Daily Trend */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-red-400" />
              Daily Trend — Last 7 Days
            </h2>
            {trend.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No trend data available</p>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {trend.map((day) => {
                  const pct = Math.round((day.views / maxViews) * 100);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-gray-500">
                        {day.views.toLocaleString()}
                      </span>
                      <div className="w-full flex items-end" style={{ height: "96px" }}>
                        <div
                          className="w-full bg-red-600 rounded-t-lg transition-all hover:bg-red-500"
                          style={{ height: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Articles */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-blue-400" />
                Top Articles
              </h2>
              {(data?.topArticles ?? []).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No data</p>
              ) : (
                <div className="space-y-2">
                  {(data?.topArticles ?? []).map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                        <span className="text-sm text-gray-300 font-mono">
                          {a.id.length > 20 ? `${a.id.slice(0, 20)}…` : a.id}
                        </span>
                      </div>
                      <span className="text-sm text-emerald-400 font-semibold">
                        {a.views.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Topics */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Top Topics
              </h2>
              {topTopics.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No data</p>
              ) : (
                <div className="space-y-3">
                  {topTopics.map((t) => {
                    const pct = Math.round((t.views / maxTopicViews) * 100);
                    return (
                      <div key={t.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-300">{t.name}</span>
                          <span className="text-xs text-gray-500">{t.views.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sponsored Campaign Performance */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-red-400" />
              Sponsored Campaign Performance
            </h2>
            {(data?.adStats ?? []).length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">No campaign data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Campaign</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Impressions</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Clicks</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(data?.adStats ?? []).map((ad) => (
                      <tr key={ad.campaignId} className="hover:bg-gray-800/50 transition-colors">
                        <td className="py-2 px-3 text-gray-300">{ad.campaignName}</td>
                        <td className="py-2 px-3 text-right text-gray-400">{ad.impressions.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-gray-400">{ad.clicks.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{ad.ctr.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Social Media Stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-400" />
              Social Media Breakdown
            </h2>
            {(data?.socialStats ?? []).length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">No social data</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {(data?.socialStats ?? []).map((s) => {
                  const platformColors: Record<string, string> = {
                    facebook: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                    instagram: "text-pink-400 bg-pink-500/10 border-pink-500/20",
                    twitter: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                  };
                  const style = platformColors[s.platform.toLowerCase()] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20";
                  return (
                    <div key={s.platform} className={`border rounded-xl px-5 py-4 min-w-[140px] ${style}`}>
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{s.platform}</p>
                      <p className="text-2xl font-bold">{s.posts}</p>
                      <p className="text-xs opacity-60 mt-0.5">posts</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Lucide icon used inline — needs separate import
function Newspaper(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}
