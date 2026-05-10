"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DashStats {
  dashboard: {
    dau: number; mau: number; viewsToday: number; completionRate: number;
    sharesToday: number; notifOpens: number;
    sponsoredImpressions: number; sponsoredClicks: number; sponsoredCtr: number;
    referralClicks: number; signups: number; totalGemsIssued: number;
    topArticles: { id: string; views: number }[];
    topTopics: { topic: string; views: number }[];
    dailyTrend: { date: string; views: number; users: number }[];
  };
  ads: { total: number; active: number; totalImpressions: number; totalClicks: number; avgCtr: number };
  referral: { totalCodes: number; totalSignups: number; totalRewardsIssued: number; conversionRate: number; fraudEvents: number };
  social: { total: number; published: number; failed: number };
  articles: { totalArticles: number; activeSources: number; todayArticles: number };
}

function Stat({ label, value, sub, color = "blue" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const c: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10",
    red: "text-red-400 bg-red-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    orange: "text-orange-400 bg-orange-500/10",
    pink: "text-pink-400 bg-pink-500/10",
    teal: "text-teal-400 bg-teal-500/10",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-black ${c[color]?.split(" ")[0]}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, emoji, label, desc }: { href: string; emoji: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-600 transition-all group">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-white font-semibold text-sm group-hover:text-red-400 transition-colors">{label}</p>
        <p className="text-gray-500 text-xs">{desc}</p>
      </div>
      <span className="ml-auto text-gray-600 group-hover:text-white">→</span>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const load = async () => {
    try {
      const r = await fetch("/api/admin/analytics");
      if (r.ok) setStats(await r.json());
    } catch { /* ignore */ }
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const d = stats?.dashboard;
  const maxViews = Math.max(...(d?.dailyTrend.map((t) => t.views) ?? [1]), 1);

  return (
    <div className="p-6 space-y-6 overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-all"
        >
          {loading ? "↻" : "🔄"} Refresh
        </button>
      </div>

      {/* Key metrics */}
      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Audience</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="DAU" value={d?.dau ?? 0} sub="Today's active users" color="blue" />
          <Stat label="MAU" value={d?.mau ?? 0} sub="Last 30 days" color="purple" />
          <Stat label="Views Today" value={d?.viewsToday ?? 0} sub="Article views" color="green" />
          <Stat label="Completion Rate" value={`${(d?.completionRate ?? 0).toFixed(1)}%`} sub="Articles fully read" color="teal" />
        </div>
      </div>

      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Engagement</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Shares Today" value={d?.sharesToday ?? 0} color="orange" />
          <Stat label="Notif Opens" value={d?.notifOpens ?? 0} color="yellow" />
          <Stat label="Referral Clicks" value={d?.referralClicks ?? 0} color="pink" />
          <Stat label="Signups" value={d?.signups ?? 0} sub="New accounts" color="green" />
        </div>
      </div>

      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Revenue & Growth</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Sponsored Impressions" value={(stats?.ads.totalImpressions ?? 0).toLocaleString()} color="blue" />
          <Stat label="Sponsored CTR" value={`${(stats?.ads.avgCtr ?? 0).toFixed(2)}%`} color="yellow" />
          <Stat label="Total Gems Issued" value={`💎 ${d?.totalGemsIssued ?? 0}`} color="purple" />
          <Stat label="Referral Signups" value={stats?.referral.totalSignups ?? 0} sub={`${(stats?.referral.conversionRate ?? 0).toFixed(1)}% conv.`} color="green" />
        </div>
      </div>

      {/* Daily trend chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">📈 7-Day Article Views</h2>
        <div className="flex items-end gap-2 h-32">
          {(d?.dailyTrend ?? []).map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-red-600 rounded-t-lg transition-all"
                style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: "4px" }}
              />
              <span className="text-gray-600 text-[9px]">
                {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
              </span>
            </div>
          ))}
          {(!d?.dailyTrend || d.dailyTrend.length === 0) && (
            <div className="flex-1 text-center text-gray-600 text-sm self-center">No data yet</div>
          )}
        </div>
      </div>

      {/* Top topics + articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-4">🏆 Top Topics</h2>
          {(d?.topTopics ?? []).length === 0 && (
            <p className="text-gray-600 text-sm">No data yet — start reading!</p>
          )}
          <div className="space-y-2">
            {(d?.topTopics ?? []).map((t, i) => (
              <div key={t.topic} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                <span className="text-white text-sm flex-1 capitalize">{t.topic}</span>
                <span className="text-gray-400 text-xs">{t.views} views</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-4">📊 Campaign Performance</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Active Campaigns</span>
              <span className="text-green-400 font-bold">{stats?.ads.active ?? 0}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total Impressions</span>
              <span className="text-white font-bold">{(stats?.ads.totalImpressions ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Total Clicks</span>
              <span className="text-white font-bold">{(stats?.ads.totalClicks ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Avg CTR</span>
              <span className="text-yellow-400 font-bold">{(stats?.ads.avgCtr ?? 0).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fraud Events</span>
              <span className="text-red-400 font-bold">{stats?.referral.fraudEvents ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <QuickLink href="/admin/campaigns" emoji="📢" label="Manage Campaigns" desc="Sponsored content & ads" />
          <QuickLink href="/admin/analytics" emoji="📊" label="Full Analytics" desc="DAU, MAU, conversions" />
          <QuickLink href="/admin/referrals" emoji="👥" label="Referral Program" desc="Codes, rewards, fraud" />
          <QuickLink href="/admin/social" emoji="📱" label="Social Publishing" desc="Auto-post to FB/IG/X" />
          <QuickLink href="/admin/articles" emoji="📰" label="Articles" desc="Moderate & approve" />
          <QuickLink href="/admin/sources" emoji="📡" label="RSS Sources" desc="Manage news feeds" />
        </div>
      </div>
    </div>
  );
}
