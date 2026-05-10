"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Rss,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import { NewsSource, Language, Category } from "@/types";

const CATEGORIES: Category[] = [
  "all","politics","business","sports","technology","entertainment","health","world","education",
];

function AddSourceModal({
  onAdd,
  onClose,
}: {
  onAdd: (s: Omit<NewsSource, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    url: "",
    language: "en" as "ne" | "en",
    category: "all" as Category,
    isActive: true,
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    onAdd(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-lg">Add RSS Source</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-medium">Source Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Kathmandu Post"
              className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-medium">RSS Feed URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/rss"
              className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-medium">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as "ne" | "en" }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none"
              >
                <option value="en">🇬🇧 English</option>
                <option value="ne">🇳🇵 Nepali</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-all"
          >
            Add Source
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sources");
      const data = await res.json();
      setSources(data.sources);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addSource = async (source: Omit<NewsSource, "id">) => {
    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    });
    const data = await res.json();
    setSources((s) => [...s, data.source]);
  };

  const toggleSource = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    setSources((s) => s.map((src) => (src.id === id ? { ...src, isActive } : src)));
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Delete this source?")) return;
    await fetch("/api/admin/sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSources((s) => s.filter((src) => src.id !== id));
  };

  const testFetch = async (id: string) => {
    setTesting(id);
    await fetch("/api/fetch-rss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setTesting(null);
    await load();
  };

  const enSources = sources.filter((s) => s.language === "en");
  const neSources = sources.filter((s) => s.language === "ne");

  function SourceList({ list, label, flag }: { list: NewsSource[]; label: string; flag: string }) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{flag}</span>
          <h2 className="text-white font-semibold">{label}</h2>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
            {list.filter((s) => s.isActive).length}/{list.length} active
          </span>
        </div>
        <div className="space-y-3">
          {list.map((source) => (
            <div
              key={source.id}
              className={`flex items-center gap-4 bg-gray-900 border rounded-xl px-4 py-3 transition-all ${
                source.isActive ? "border-gray-800" : "border-gray-800/50 opacity-60"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Rss className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">{source.name}</p>
                  <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded capitalize flex-shrink-0">
                    {source.category}
                  </span>
                </div>
                <p className="text-gray-600 text-xs truncate mt-0.5">{source.url}</p>
                {source.lastFetched && (
                  <p className="text-gray-700 text-[10px] mt-0.5">
                    Last fetched: {new Date(source.lastFetched).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-600 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => testFetch(source.id)}
                  disabled={testing === source.id}
                  className="p-1.5 text-gray-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  title="Test fetch"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testing === source.id ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={() => toggleSource(source.id, !source.isActive)}
                  className={`transition-colors ${
                    source.isActive ? "text-emerald-400" : "text-gray-600"
                  }`}
                >
                  {source.isActive ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-center py-8 text-gray-700 text-sm border border-gray-800 rounded-xl border-dashed">
              No sources added yet
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">RSS Sources</h1>
          <p className="text-gray-500 text-sm">{sources.length} total sources</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Source
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <SourceList list={enSources} label="English Sources" flag="🇬🇧" />
          <SourceList list={neSources} label="Nepali Sources" flag="🇳🇵" />
        </>
      )}

      {showAdd && <AddSourceModal onAdd={addSource} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
