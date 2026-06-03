"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Users, Smartphone, Mail, Globe, RefreshCw } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  provider: "google" | "phone" | "magic_link" | "email";
  createdAt: string;
}

interface Breakdown { google: number; phone: number; magic_link: number; email: number }

const PROVIDER_LABEL: Record<string, { label: string; icon: string; color: string }> = {
  google:     { label: "Google",     icon: "🔵", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  phone:      { label: "Phone OTP",  icon: "📱", color: "bg-green-500/15 text-green-400 border-green-500/20" },
  magic_link: { label: "Magic Link", icon: "✉️", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  email:      { label: "Email",      icon: "🔑", color: "bg-gray-500/15 text-gray-400 border-gray-500/20" },
};

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [provider, setProvider]   = useState("");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading]     = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search)   params.set("q", search);
    if (provider) params.set("provider", provider);
    try {
      const res  = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
        setBreakdown(data.breakdown);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, provider]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  const ago = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / 2592000)}mo ago`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total.toLocaleString()} registered users</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Breakdown cards */}
      {breakdown && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "google",     label: "Google",      icon: "🔵", val: breakdown.google },
            { key: "phone",      label: "Phone OTP",   icon: "📱", val: breakdown.phone },
            { key: "magic_link", label: "Magic Link",  icon: "✉️", val: breakdown.magic_link },
            { key: "email",      label: "Email/Pass",  icon: "🔑", val: breakdown.email },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => { setProvider(p => p === c.key ? "" : c.key); setPage(1); }}
              className={`rounded-2xl p-4 text-left border transition-all ${
                provider === c.key
                  ? "bg-red-600/20 border-red-500/40"
                  : "bg-gray-900 border-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-black text-white">{c.val.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 font-semibold px-4 py-3">User</th>
              <th className="text-left text-gray-500 font-semibold px-4 py-3 hidden md:table-cell">Email</th>
              <th className="text-left text-gray-500 font-semibold px-4 py-3">Provider</th>
              <th className="text-left text-gray-500 font-semibold px-4 py-3 hidden sm:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="text-center py-12 text-gray-500">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={4} className="text-center py-12 text-gray-500">No users found</td></tr>
            )}
            {!loading && users.map((u, i) => {
              const p = PROVIDER_LABEL[u.provider] ?? PROVIDER_LABEL.email;
              return (
                <tr key={u._id} className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${i % 2 === 0 ? "" : "bg-gray-800/20"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-blue-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {u.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-white font-medium truncate max-w-[120px]">{u.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell truncate max-w-[200px]">
                    {u.email?.includes("@phone.") ? u.email.split("@")[0] : u.email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${p.color}`}>
                      {p.icon} {p.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="text-gray-300">{fmt(u.createdAt)}</div>
                    <div className="text-gray-500 text-xs">{ago(u.createdAt)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-gray-500 text-xs">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
