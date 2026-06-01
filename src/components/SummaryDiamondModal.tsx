"use client";
// Web twin of the Expo SummaryModal — the on-demand AI summary, gated by 5💎.
//
// On open it FIRST spends 5💎 (server-authoritative, once per article). Then:
//   • charged → play a floating "−5 💎", then load the summary.
//   • already unlocked → free re-open, no charge.
//   • not enough diamonds → paywall (earn more via polls / reading).
// The summary itself is generated once (DeepSeek) and shared with every reader.
import { useEffect, useState } from "react";
import { spendForSummary, SUMMARY_COST } from "@/lib/diamonds-client";

type Phase = "unlocking" | "paywall" | "loading" | "error" | "ready";

export default function SummaryDiamondModal({
  articleId,
  title,
  lang,
  isNepali,
  onClose,
  onBalanceChange,
}: {
  articleId: string;
  title: string;
  lang: "ne" | "en";
  isNepali: boolean;
  onClose: () => void;
  onBalanceChange?: (balance: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("unlocking");
  const [summary, setSummary] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [charged, setCharged] = useState(false);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;

    (async () => {
      const spend = await spendForSummary(articleId);
      if (cancelled) return;

      setBalance(spend.balance);
      onBalanceChange?.(spend.balance);

      if (spend.reason === "insufficient") { setPhase("paywall"); return; }
      if (!spend.ok || !spend.unlocked) { setPhase("error"); return; }

      if (spend.charged) setCharged(true);

      setPhase("loading");
      try {
        const params = new URLSearchParams({ articleId, lang, mode: "short" });
        const res = await fetch(`/api/summary?${params}`);
        const data = (await res.json()) as { summary?: string | null };
        if (cancelled) return;
        if (data?.summary) { setSummary(data.summary); setPhase("ready"); }
        else setPhase("error");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, lang]);

  const retry = async () => {
    setPhase("loading");
    try {
      const params = new URLSearchParams({ articleId, lang, mode: "short" });
      const res = await fetch(`/api/summary?${params}`);
      const data = (await res.json()) as { summary?: string | null };
      if (data?.summary) { setSummary(data.summary); setPhase("ready"); }
      else setPhase("error");
    } catch { setPhase("error"); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <style>{`@keyframes diamondFloat{0%{opacity:0;transform:translateY(8px)}15%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}`}</style>
      <div
        className="w-full max-w-md bg-[#111] border-t border-white/10 rounded-t-3xl p-5 pb-8 shadow-2xl"
        style={{ animation: "fadeSlideUp 0.3s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        {/* Header: brand + live balance */}
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[12px] font-black tracking-wider text-red-500">
            ✨ {isNepali ? "सारांश" : "AI SUMMARY"}
          </span>
          <div className="relative">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[13px] font-black text-white">💎 {balance}</span>
            {charged && (
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1 text-[15px] font-black text-red-500"
                style={{ animation: "diamondFloat 1.3s ease-out" }}
              >
                −{SUMMARY_COST} 💎
              </span>
            )}
          </div>
          <button onClick={onClose} className="ml-auto h-8 w-8 rounded-full bg-white/10 text-white/70 text-lg leading-none">×</button>
        </div>

        <h3 className="mb-3 text-[16px] font-bold leading-snug text-white line-clamp-3">{title}</h3>
        <div className="mb-3 h-px bg-white/10" />

        {/* Body */}
        <div className="max-h-[45vh] overflow-y-auto">
          {phase === "unlocking" || phase === "loading" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-red-500" />
              <p className="text-sm font-semibold text-white/60">
                {phase === "unlocking"
                  ? (isNepali ? "अनलक गर्दै…" : "Unlocking…")
                  : (isNepali ? "सारांश तयार हुँदैछ…" : "Generating summary…")}
              </p>
            </div>
          ) : phase === "paywall" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-4xl">💎</span>
              <p className="text-lg font-black text-white">{isNepali ? "पर्याप्त डायमन्ड छैन" : "Not enough diamonds"}</p>
              <p className="text-sm text-white/60">
                {isNepali
                  ? `सारांशका लागि ${SUMMARY_COST} 💎 चाहिन्छ। तपाईंसँग ${balance} 💎 छ।`
                  : `Summaries cost ${SUMMARY_COST} 💎. You have ${balance} 💎.`}
              </p>
              <p className="text-xs text-white/40 px-4">
                {isNepali
                  ? "दैनिक मतदानको उत्तर दिएर र समाचार पढेर थप डायमन्ड कमाउनुहोस्।"
                  : "Earn more by answering the daily poll and reading stories."}
              </p>
              <button onClick={onClose} className="mt-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white active:scale-95">
                {isNepali ? "ठीक छ" : "Got it"}
              </button>
            </div>
          ) : phase === "error" ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-3xl">😕</span>
              <p className="text-sm font-semibold text-white/60">{isNepali ? "सारांश बनाउन सकिएन।" : "Couldn't generate the summary."}</p>
              <button onClick={retry} className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white active:scale-95">
                {isNepali ? "पुनः प्रयास" : "Try again"}
              </button>
            </div>
          ) : (
            <>
              {charged && (
                <p className="mb-2 text-[12px] font-bold text-red-500">
                  {isNepali ? `${SUMMARY_COST} 💎 खर्च भयो` : `${SUMMARY_COST} 💎 spent`}
                </p>
              )}
              <p className="text-[15px] leading-relaxed text-white/90 font-medium">{summary}</p>
              <p className="mt-4 text-[11px] italic text-white/40">
                {isNepali
                  ? "AI द्वारा उत्पन्न सारांश। मूल समाचारका लागि पूरा कथा पढ्नुहोस्।"
                  : "AI-generated summary. Read the full story for complete context."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
