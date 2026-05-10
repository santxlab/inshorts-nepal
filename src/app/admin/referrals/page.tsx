"use client";
import { useEffect, useState } from "react";
import {
  Link2,
  UserPlus,
  Gift,
  ShieldAlert,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";

interface ReferralStats {
  totalCodes?: number;
  totalClicks?: number;
  installs?: number;
  signups?: number;
  rewardsIssued?: number;
  conversionRate?: number;
  fraudEvents?: number;
}

interface ReferralEvent {
  id: string;
  code: string;
  eventType: string;
  timestamp: string;
  userId?: string;
  rewardAmount?: number;
  fraudFlags?: string[];
}

interface GeneratedCode {
  code: string;
  referralLink: string;
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  install: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  signup: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  reward: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  click: "bg-purple-500/20 text-purple-400 border-purple-500/20",
  fraud: "bg-red-500/20 text-red-400 border-red-500/20",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color = "red",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    red: "text-red-400 bg-red-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    orange: "text-orange-400 bg-orange-500/10",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
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

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config form state
  const [configActive, setConfigActive] = useState(true);
  const [installReward, setInstallReward] = useState(50);
  const [signupReward, setSignupReward] = useState(100);
  const [firstActionReward, setFirstActionReward] = useState(25);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [maxRewardsPerReferrer, setMaxRewardsPerReferrer] = useState(10);
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Test code state
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Extract referral stats from analytics response
      setStats({
        totalCodes: data.referralCodes ?? data.totalCodes ?? 0,
        totalClicks: data.referralClicks ?? 0,
        installs: data.installs ?? 0,
        signups: data.referralSignups ?? data.signups ?? 0,
        rewardsIssued: data.gemsIssued ?? data.rewardsIssued ?? 0,
        conversionRate: data.referralConversionRate ?? 0,
        fraudEvents: data.fraudEvents ?? 0,
      });
      setEvents(data.referralEvents ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await fetch("/api/referral/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: configActive,
          installReward,
          signupReward,
          firstActionReward,
          cooldownHours,
          maxRewardsPerReferrer,
          campaignStart,
          campaignEnd,
        }),
      });
      alert("Config saved successfully");
    } catch {
      alert("Failed to save config (API not implemented yet)");
    } finally {
      setSavingConfig(false);
    }
  };

  const generateTestCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/referral/code?userId=test-admin-001&name=Admin");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGeneratedCode({
        code: data.code ?? "ADMIN-TEST",
        referralLink: data.referralLink ?? `https://inshortsnepal.org/ref/${data.code ?? "ADMIN-TEST"}`,
      });
    } catch {
      setGeneratedCode({
        code: "ADMIN-TEST-001",
        referralLink: "https://inshortsnepal.org/ref/ADMIN-TEST-001",
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyLink = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Referral System</h1>
          <p className="text-gray-500 text-sm">
            Manage referral campaigns, rewards, and monitor performance
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard icon={Link2} label="Total Codes" value={(stats?.totalCodes ?? 0).toLocaleString()} color="blue" />
            <StatCard icon={TrendingUp} label="Total Clicks" value={(stats?.totalClicks ?? 0).toLocaleString()} color="purple" />
            <StatCard icon={UserPlus} label="Installs" value={(stats?.installs ?? 0).toLocaleString()} color="green" />
            <StatCard icon={UserPlus} label="Signups" value={(stats?.signups ?? 0).toLocaleString()} color="yellow" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard icon={Gift} label="Rewards Issued" value={(stats?.rewardsIssued ?? 0).toLocaleString()} color="orange" />
            <StatCard icon={TrendingUp} label="Conversion Rate" value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`} color="green" />
            <StatCard icon={ShieldAlert} label="Fraud Events" value={(stats?.fraudEvents ?? 0).toLocaleString()} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Config Panel */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-white">Referral Config</h2>
                <button
                  onClick={() => setConfigActive((v) => !v)}
                  className="flex items-center gap-2 text-sm transition-colors"
                >
                  {configActive ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-500" />
                  )}
                  <span className={configActive ? "text-emerald-400" : "text-gray-500"}>
                    {configActive ? "Active" : "Inactive"}
                  </span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Install Reward</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        value={installReward}
                        onChange={(e) => setInstallReward(+e.target.value)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">💎</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Signup Reward</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        value={signupReward}
                        onChange={(e) => setSignupReward(+e.target.value)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">💎</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">First Action</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        value={firstActionReward}
                        onChange={(e) => setFirstActionReward(+e.target.value)}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">💎</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cooldown (hours)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={cooldownHours}
                      onChange={(e) => setCooldownHours(+e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Rewards / Referrer</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={maxRewardsPerReferrer}
                      onChange={(e) => setMaxRewardsPerReferrer(+e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Campaign Start</label>
                    <input
                      type="date"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={campaignStart}
                      onChange={(e) => setCampaignStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Campaign End</label>
                    <input
                      type="date"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={campaignEnd}
                      onChange={(e) => setCampaignEnd(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  {savingConfig ? "Saving..." : "Save Config"}
                </button>
              </div>
            </div>

            {/* Test Code Generator */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-2">Test Code Generator</h2>
              <p className="text-gray-500 text-xs mb-5">
                Generate a referral code for admin testing. Uses userId=test-admin-001.
              </p>

              <button
                onClick={generateTestCode}
                disabled={generatingCode}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all mb-4"
              >
                {generatingCode ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-yellow-400" />
                )}
                {generatingCode ? "Generating..." : "Generate Test Code"}
              </button>

              {generatedCode && (
                <div className="space-y-3">
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Referral Code</p>
                    <p className="text-xl font-bold text-white font-mono tracking-widest">
                      {generatedCode.code}
                    </p>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center gap-2">
                    <p className="text-xs text-gray-400 font-mono flex-1 truncate">
                      {generatedCode.referralLink}
                    </p>
                    <button
                      onClick={copyLink}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                        copied
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Events Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Recent Referral Events</h2>
            {events.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No referral events yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Code</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Event</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">User</th>
                      <th className="text-right py-2 px-3 text-gray-500 font-medium">Reward</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Fraud Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {events.map((ev) => {
                      const typeKey = ev.eventType?.toLowerCase() ?? "click";
                      const style = EVENT_TYPE_STYLES[typeKey] ?? "bg-gray-500/20 text-gray-400 border-gray-500/20";
                      return (
                        <tr key={ev.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="py-2 px-3 font-mono text-gray-300 text-xs">{ev.code}</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${style}`}>
                              {ev.eventType}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-500 text-xs">{timeAgo(ev.timestamp)}</td>
                          <td className="py-2 px-3 text-gray-400 text-xs font-mono">
                            {ev.userId ? ev.userId.slice(0, 12) + "…" : "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-yellow-400 text-xs font-semibold">
                            {ev.rewardAmount ? `+${ev.rewardAmount} 💎` : "—"}
                          </td>
                          <td className="py-2 px-3">
                            {ev.fraudFlags && ev.fraudFlags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {ev.fraudFlags.map((flag) => (
                                  <span key={flag} className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md">
                                    {flag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-700 text-xs">none</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
