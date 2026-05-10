"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  X,
  Megaphone,
  Eye,
  MousePointerClick,
  TrendingUp,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type CampaignStatus = "active" | "draft" | "paused" | "expired" | "scheduled";
type CreativeType =
  | "article_card"
  | "banner"
  | "inline_card"
  | "breaking_strip"
  | "carousel_card";
type BudgetType = "impression_cap" | "fixed_budget";

interface Campaign {
  id: string;
  name: string;
  sponsorName: string;
  status: CampaignStatus;
  creativeType: CreativeType;
  labelType: string;
  title: string;
  description?: string;
  imageUrl?: string;
  landingUrl: string;
  ctaText: string;
  placements: string[];
  impressionsPerDay: number;
  minGapMinutes: number;
  maxPerSession: number;
  showEveryNCards: number;
  budgetType: BudgetType;
  budgetCap: number;
  budgetSpent: number;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  priority: number;
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  draft: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20",
  paused: "bg-gray-500/20 text-gray-400 border border-gray-500/20",
  expired: "bg-red-500/20 text-red-400 border border-red-500/20",
  scheduled: "bg-blue-500/20 text-blue-400 border border-blue-500/20",
};

const PLACEMENTS = [
  { id: "home_feed", label: "Home Feed" },
  { id: "category_feed", label: "Category Feed" },
  { id: "article_detail", label: "Article Detail" },
  { id: "breaking_ticker", label: "Breaking Ticker" },
];

const CREATIVE_TYPES: CreativeType[] = [
  "article_card",
  "banner",
  "inline_card",
  "breaking_strip",
  "carousel_card",
];

const LABEL_TYPES = ["Sponsored", "Advertisement", "Partner Content"];

const EMPTY_FORM = {
  name: "",
  sponsorName: "",
  creativeType: "article_card" as CreativeType,
  labelType: "Sponsored",
  title: "",
  description: "",
  imageUrl: "",
  landingUrl: "",
  ctaText: "Learn More",
  placements: [] as string[],
  impressionsPerDay: 1000,
  minGapMinutes: 30,
  maxPerSession: 2,
  showEveryNCards: 5,
  budgetType: "impression_cap" as BudgetType,
  budgetCap: 10000,
  startDate: "",
  endDate: "",
  priority: 5,
  status: "draft" as CampaignStatus,
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
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = campaigns.length;
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const avgCTR =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  const updateStatus = async (id: string, status: CampaignStatus) => {
    try {
      await fetch("/api/admin/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch {
      alert("Failed to update campaign status");
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await fetch("/api/admin/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Failed to delete campaign");
    }
  };

  const togglePlacement = (id: string) => {
    setForm((f) => ({
      ...f,
      placements: f.placements.includes(id)
        ? f.placements.filter((p) => p !== id)
        : [...f.placements, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      await load();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Sponsored Campaigns</h1>
          <p className="text-gray-500 text-sm">
            Manage ad creatives, budgets, placements and scheduling
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Megaphone} label="Total Campaigns" value={total} color="blue" />
        <StatCard icon={CheckCircle} label="Active" value={activeCount} color="green" />
        <StatCard icon={Eye} label="Total Impressions" value={totalImpressions.toLocaleString()} color="purple" />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks.toLocaleString()} color="yellow" />
        <StatCard icon={TrendingUp} label="Avg CTR" value={`${avgCTR}%`} color="red" />
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No campaigns yet. Create your first campaign.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Campaign</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Impressions</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Clicks</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">CTR</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Budget</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Dates</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {campaigns.map((c) => {
                  const ctr =
                    c.impressions > 0
                      ? ((c.clicks / c.impressions) * 100).toFixed(2)
                      : "0.00";
                  const budgetPct =
                    c.budgetCap > 0
                      ? Math.min(100, Math.round((c.budgetSpent / c.budgetCap) * 100))
                      : 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{c.name}</p>
                        <p className="text-gray-500 text-xs">{c.sponsorName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${STATUS_STYLES[c.status]}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-xs bg-gray-800 px-2 py-1 rounded-md">
                          {c.creativeType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {(c.impressions ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {(c.clicks ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{ctr}%</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{(c.budgetSpent ?? 0).toLocaleString()}</span>
                          <span>{(c.budgetCap ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${budgetPct >= 90 ? "bg-red-500" : budgetPct >= 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5">{budgetPct}% used</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div>{c.startDate?.slice(0, 10) ?? "—"}</div>
                        <div>{c.endDate?.slice(0, 10) ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.status === "active" ? (
                            <button
                              onClick={() => updateStatus(c.id, "paused")}
                              className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all"
                              title="Pause"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus(c.id, "active")}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                              title="Activate"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteCampaign(c.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">New Campaign</h2>
              <button
                onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); setSaveError(null); }}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {saveError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {/* Basic Info */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Campaign Name *</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Summer Sale"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sponsor Name *</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.sponsorName}
                      onChange={(e) => setForm((f) => ({ ...f, sponsorName: e.target.value }))}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Creative Type</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.creativeType}
                      onChange={(e) => setForm((f) => ({ ...f, creativeType: e.target.value as CreativeType }))}
                    >
                      {CREATIVE_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Label Type</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.labelType}
                      onChange={(e) => setForm((f) => ({ ...f, labelType: e.target.value }))}
                    >
                      {LABEL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Creative */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Creative Content</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Title *</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ad headline"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors resize-none"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Short description..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        value={form.imageUrl}
                        onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">CTA Text</label>
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        value={form.ctaText}
                        onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                        placeholder="Learn More"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Landing URL *</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.landingUrl}
                      onChange={(e) => setForm((f) => ({ ...f, landingUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </section>

              {/* Placements */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Placements</h3>
                <div className="flex flex-wrap gap-2">
                  {PLACEMENTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlacement(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        form.placements.includes(p.id)
                          ? "bg-red-600/20 text-red-400 border-red-600/30"
                          : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Frequency */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Frequency Controls</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Impressions / Day</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.impressionsPerDay}
                      onChange={(e) => setForm((f) => ({ ...f, impressionsPerDay: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min Gap (minutes)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.minGapMinutes}
                      onChange={(e) => setForm((f) => ({ ...f, minGapMinutes: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max per Session</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.maxPerSession}
                      onChange={(e) => setForm((f) => ({ ...f, maxPerSession: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Show Every N Cards</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.showEveryNCards}
                      onChange={(e) => setForm((f) => ({ ...f, showEveryNCards: +e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {/* Budget */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Budget</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Budget Type</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.budgetType}
                      onChange={(e) => setForm((f) => ({ ...f, budgetType: e.target.value as BudgetType }))}
                    >
                      <option value="impression_cap">Impression Cap</option>
                      <option value="fixed_budget">Fixed Budget</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Budget Cap Amount</label>
                    <input
                      type="number"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.budgetCap}
                      onChange={(e) => setForm((f) => ({ ...f, budgetCap: +e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              {/* Schedule */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Schedule & Priority</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Priority (1-10)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.priority}
                      onChange={(e) => setForm((f) => ({ ...f, priority: +e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Initial Status</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CampaignStatus }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); setSaveError(null); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {saving ? "Saving..." : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
