"use client";
import { useEffect, useState } from "react";

interface PushStats {
  vapidPublicKey: string;
  subscriberCount: number;
  dailyStats: { totalSentToday: number; capsReached: number };
}

interface SendResult {
  sent: number;
  failed: number;
  skippedCap: number;
}

interface LogEntry {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  recipientCount: number;
  openCount: number;
}

export default function AdminPushPage() {
  const [stats, setStats] = useState<PushStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("🔔 Test Notification");
  const [body, setBody] = useState("This is a test push notification from InShorts Nepal admin.");
  const [url, setUrl] = useState("/");
  const [lang, setLang] = useState("all");

  const loadStats = async () => {
    try {
      const r = await fetch("/api/push/subscribe");
      if (r.ok) setStats(await r.json());
      const lr = await fetch("/api/push/send");
      if (lr.ok) {
        const d = await lr.json();
        setLogs(d.logs ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, []);

  const sendTest = async () => {
    if (!title || !body) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const r = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          url,
          language: lang === "all" ? undefined : lang,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult(data);
        await loadStats();
      } else {
        setError(data.error ?? "Send failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  const sendBreaking = async () => {
    setTitle("🚨 Breaking News Test");
    setBody("This is a breaking news test notification from InShorts Nepal.");
    setUrl("/");
  };

  const isVapidConfigured = stats?.vapidPublicKey && stats.vapidPublicKey.length > 10;

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">🔔 Push Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Test, send, and monitor push notifications</p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* VAPID status */}
        <div className={`rounded-2xl p-5 border ${isVapidConfigured ? "bg-green-900/20 border-green-700/40" : "bg-red-900/20 border-red-700/40"}`}>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">VAPID Keys</p>
          <p className={`text-xl font-black ${isVapidConfigured ? "text-green-400" : "text-red-400"}`}>
            {loading ? "…" : isVapidConfigured ? "✅ Set" : "❌ Missing"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isVapidConfigured ? "Notifications can be sent" : "Add VAPID keys to Vercel env"}
          </p>
        </div>

        {/* Subscriber count */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Subscribers</p>
          <p className="text-2xl font-black text-blue-400">
            {loading ? "…" : (stats?.subscriberCount ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Active push subscriptions</p>
        </div>

        {/* Sent today */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Sent Today</p>
          <p className="text-2xl font-black text-purple-400">
            {loading ? "…" : (stats?.dailyStats.totalSentToday ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total notifications sent</p>
        </div>

        {/* Cap reached */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Cap Reached</p>
          <p className="text-2xl font-black text-yellow-400">
            {loading ? "…" : (stats?.dailyStats.capsReached ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Users at daily limit (5/day)</p>
        </div>
      </div>

      {/* VAPID not configured warning */}
      {!loading && !isVapidConfigured && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-2xl p-5">
          <h3 className="text-red-400 font-bold mb-2">⚠️ VAPID Keys Not Configured</h3>
          <p className="text-gray-400 text-sm mb-3">Push notifications won&apos;t work until you add these to Vercel env vars:</p>
          <div className="space-y-1 text-xs font-mono text-gray-300">
            <p>NEXT_PUBLIC_VAPID_PUBLIC_KEY = your_public_key</p>
            <p>VAPID_PRIVATE_KEY = your_private_key</p>
            <p>VAPID_SUBJECT = mailto:admin@inshortsnepal.org</p>
          </div>
          <p className="text-gray-500 text-xs mt-3">Generate keys: <code className="text-yellow-400">npx web-push generate-vapid-keys</code></p>
        </div>
      )}

      {/* Subscriber count = 0 warning */}
      {!loading && isVapidConfigured && (stats?.subscriberCount ?? 0) === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-5">
          <h3 className="text-yellow-400 font-bold mb-2">⚠️ No Subscribers Yet</h3>
          <p className="text-gray-400 text-sm">Open the app on your phone → swipe 5+ cards → close and reopen → the &quot;Enable notifications&quot; prompt will appear.</p>
          <p className="text-gray-500 text-xs mt-2">Or visit the app and allow notifications when prompted.</p>
        </div>
      )}

      {/* Send notification form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-5">📤 Send Test Notification</h2>

        {/* Quick presets */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => { setTitle("🔔 Test Notification"); setBody("This is a test from InShorts Nepal admin panel."); setUrl("/"); }}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600"
          >
            General Test
          </button>
          <button
            onClick={sendBreaking}
            className="px-3 py-1.5 bg-red-900/40 text-red-400 border border-red-700/40 rounded-lg text-xs hover:bg-red-900/60"
          >
            🚨 Breaking News
          </button>
          <button
            onClick={() => { setTitle("☀️ Good Morning Nepal"); setBody("Here are today's top stories from InShorts Nepal."); setUrl("/"); }}
            className="px-3 py-1.5 bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 rounded-lg text-xs hover:bg-yellow-900/50"
          >
            ☀️ Morning Digest
          </button>
          <button
            onClick={() => { setTitle("🌙 Evening Brief"); setBody("Catch up on what happened in Nepal today."); setUrl("/"); }}
            className="px-3 py-1.5 bg-blue-900/30 text-blue-400 border border-blue-700/30 rounded-lg text-xs hover:bg-blue-900/50"
          >
            🌙 Evening Brief
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
              placeholder="Notification title..."
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
              placeholder="Notification message..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">URL (on click)</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
                placeholder="/"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 block">Language</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
              >
                <option value="all">All subscribers</option>
                <option value="ne">Nepali only</option>
                <option value="en">English only</option>
              </select>
            </div>
          </div>

          {/* Result / error */}
          {result && (
            <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
              <p className="text-green-400 font-bold">✅ Notification sent!</p>
              <div className="flex gap-6 mt-2 text-sm text-gray-400">
                <span>Delivered: <span className="text-green-400 font-bold">{result.sent}</span></span>
                <span>Failed: <span className="text-red-400 font-bold">{result.failed}</span></span>
                <span>Capped: <span className="text-yellow-400 font-bold">{result.skippedCap}</span></span>
              </div>
              {result.sent === 0 && (
                <p className="text-yellow-400 text-xs mt-2">
                  ⚠️ 0 delivered — make sure you have subscribers (open the app on your phone and allow notifications first)
                </p>
              )}
            </div>
          )}
          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
              <p className="text-red-400 font-bold">❌ Error: {error}</p>
            </div>
          )}

          <button
            onClick={sendTest}
            disabled={sending || !title || !body}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-base transition-all"
          >
            {sending ? "Sending…" : `🚀 Send to ${stats?.subscriberCount ?? 0} subscribers`}
          </button>
        </div>
      </div>

      {/* Recent logs */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-4">📋 Recent Notifications</h2>
        {logs.length === 0 ? (
          <p className="text-gray-600 text-sm">No notifications sent yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-800 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{log.title}</p>
                  <p className="text-gray-400 text-xs truncate mt-0.5">{log.body}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {new Date(log.sentAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-green-400 text-sm font-bold">{log.recipientCount} sent</p>
                  <p className="text-blue-400 text-xs">{log.openCount} opens</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
