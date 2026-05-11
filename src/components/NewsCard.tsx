"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { NewsArticle } from "@/types";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useGamification } from "@/contexts/GamificationContext";
import { getTopicById } from "@/lib/topics-config";
import {
  createSignal,
  recordSignal,
  loadBehaviorProfile,
  saveBehaviorProfile,
} from "@/lib/behavior";
import { getFallbackImage } from "@/lib/image-fallbacks";
import { recordBookmark, recordShare as recordEngShare } from "@/lib/engagement";

interface Props {
  article: NewsArticle;
  index: number;
  total: number;
  isActive: boolean;
}

function timeAgo(iso: string, ne = false): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return ne ? "भर्खर" : "Just now";
  if (diff < 3600) return ne ? `${Math.floor(diff / 60)} मिनेट अघि` : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return ne ? `${Math.floor(diff / 3600)} घण्टा अघि` : `${Math.floor(diff / 3600)}h ago`;
  return ne ? `${Math.floor(diff / 86400)} दिन अघि` : `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsCard({ article, index, total, isActive }: Props) {
  const { prefs, toggleSaved, isSaved } = useUserPrefs();
  const { onArticleRead, onShare, onSave } = useGamification();

  const saved = isSaved(article.id);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeFlash, setLikeFlash] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [imgError, setImgError] = useState(false);

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef<number>(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startReadTime = useRef<number>(Date.now());

  const likedRef = useRef(false);
  const savedRef = useRef(isSaved(article.id));
  const sharedRef = useRef(false);
  const audioListenedRef = useRef(false);

  const isNepali = prefs.language !== "en";
  const topicConfig = article.topics?.[0] ? getTopicById(article.topics[0]) : null;
  // Use article image; if missing/broken, use curated category fallback
  const displayImage = imgError || !article.imageUrl
    ? getFallbackImage(article.id, article.topics ?? [], article.category)
    : article.imageUrl;
  const hasImage = true; // always show an image with fallback system

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Keep refs in sync
  useEffect(() => { likedRef.current = liked; }, [liked]);
  useEffect(() => { savedRef.current = isSaved(article.id); }, [isSaved, article.id]);
  useEffect(() => { audioListenedRef.current = isPlaying; }, [isPlaying]);

  // Track read time
  useEffect(() => {
    if (!isActive) return;
    startReadTime.current = Date.now();
    return () => {
      const timeSpentMs = Date.now() - startReadTime.current;
      const readTimeMs = (article.readTimeSeconds ?? 60) * 1000;
      const readPercent = Math.min(100, Math.round((timeSpentMs / readTimeMs) * 100));
      const skipped = timeSpentMs < 3000 && readPercent < 20;
      if (timeSpentMs > 5000) onArticleRead();
      try {
        const profile = loadBehaviorProfile();
        const signal = createSignal(article.id, article.topics ?? [], article.language, {
          readPercent, timeSpentMs,
          liked: likedRef.current, saved: savedRef.current,
          shared: sharedRef.current, audioListened: audioListenedRef.current, skipped,
        });
        saveBehaviorProfile(recordSignal(profile, signal));
      } catch { /* non-critical */ }
    };
  }, [isActive, article, onArticleRead]);

  // Stop audio when card leaves view
  useEffect(() => {
    if (!isActive && isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  const handleSave = useCallback(() => {
    toggleSaved(article.id);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 700);
    const newCount = saved ? prefs.savedArticleIds.length - 1 : prefs.savedArticleIds.length + 1;
    onSave(newCount);
    if (!saved) recordBookmark(); // track for engagement prompts
  }, [article.id, toggleSaved, onSave, saved, prefs.savedArticleIds.length]);

  const handleLike = useCallback(() => {
    setLiked((v) => !v);
    setLikeFlash(true);
    setTimeout(() => setLikeFlash(false), 700);
  }, []);

  const handleShare = useCallback(async () => {
    onShare();
    sharedRef.current = true;
    recordEngShare(); // track for engagement prompts
    const text = `${article.title}\n\n${article.summary}\n\n${article.sourceUrl}`;
    try {
      if (navigator.share) await navigator.share({ title: article.title, text, url: article.sourceUrl });
      else await navigator.clipboard.writeText(text);
    } catch { /* cancelled */ }
  }, [article, onShare]);

  const handleAudio = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    const utterance = new SpeechSynthesisUtterance(`${article.title}. ${article.summary}`);
    utterance.lang = article.language === "ne" ? "ne-NP" : "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [article, isPlaying]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    holdTimer.current = setTimeout(() => handleAudio(), 700);
  }, [handleAudio]);

  const onTouchMove = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const dt = Date.now() - touchStart.current.time;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const now = Date.now();

    if (absDx < 12 && absDy < 12 && dt < 300) {
      if (now - lastTap.current < 350) {
        if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
        handleLike();
        lastTap.current = 0;
        touchStart.current = null;
        return;
      }
      lastTap.current = now;
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        setShowDetail(true);
      }, 280);
      touchStart.current = null;
      return;
    }
    touchStart.current = null;
  }, [handleLike]);

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden select-none"
      style={{ background: "#0f0f0f" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── IMAGE SECTION (top ~52%) ────────────────────────── */}
      <div className="relative flex-shrink-0" style={{ height: "52%" }}>
        {/* Always show image — uses curated fallback if source image missing/broken */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImage}
          alt={article.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {/* Subtle bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0f0f0f] to-transparent" />

        {/* Breaking badge */}
        {article.isBreaking && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-black uppercase tracking-widest">Breaking</span>
          </div>
        )}

        {/* Progress indicator */}
        <div className="absolute top-3 right-3 flex gap-0.5 items-center">
          {Array.from({ length: Math.min(total, 7) }).map((_, i) => {
            const mapped = Math.round((index / Math.max(total - 1, 1)) * 6);
            return (
              <div
                key={i}
                className={`rounded-full transition-all ${i === mapped ? "w-4 h-1 bg-white" : "w-1 h-1 bg-white/40"}`}
              />
            );
          })}
        </div>

        {/* Audio bars */}
        {isPlaying && (
          <div className="absolute bottom-4 right-3 flex gap-0.5 items-end bg-black/50 px-2 py-1.5 rounded-full backdrop-blur-sm">
            {[3, 5, 4, 6, 3, 5, 4].map((h, i) => (
              <div
                key={i}
                className="w-0.5 bg-white rounded-full"
                style={{ height: `${h * 2}px`, animation: `audioWave 0.8s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENT SECTION (bottom ~48%) ──────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-2">
        {/* Source + meta row */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="text-white/50 text-[11px] font-semibold">{article.sourceName}</span>
          <span className="text-white/25 text-[11px]">•</span>
          <span className="text-white/40 text-[11px]">{timeAgo(article.publishedAt, isNepali)}</span>
          {topicConfig && (
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: topicConfig.color + "cc" }}
            >
              {topicConfig.emoji} {isNepali ? topicConfig.labelNe : topicConfig.label}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-white text-[17px] font-black leading-snug mb-2 line-clamp-3">
          {article.title}
        </h2>

        {/* Summary (scrollable/expandable) */}
        <div className="flex-1 min-h-0 overflow-y-auto mb-2 news-card-detail">
          <p
            className={`text-white/65 text-[13px] leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
            onClick={() => setExpanded((v) => !v)}
          >
            {article.summary}
          </p>
          {!expanded && article.summary.length > 120 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-white/35 text-[11px] mt-1 flex items-center gap-1"
            >
              {isNepali ? "थप पढ्नुहोस्" : "more"} ▾
            </button>
          )}
        </div>

        {/* ── ACTION BAR ──────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/8 flex-shrink-0">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 transition-all active:scale-95 ${
              liked ? "bg-red-500/20" : "bg-white/6"
            }`}
          >
            <span className="text-lg leading-none">{liked ? "❤️" : "🤍"}</span>
            <span className={`text-[9px] font-medium ${liked ? "text-red-400" : "text-white/40"}`}>
              {isNepali ? "लाइक" : "Like"}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 transition-all active:scale-95 ${
              saved ? "bg-amber-500/20" : "bg-white/6"
            }`}
          >
            <span className="text-lg leading-none">{saved ? "🔖" : "📋"}</span>
            <span className={`text-[9px] font-medium ${saved ? "text-amber-400" : "text-white/40"}`}>
              {isNepali ? "सेव" : "Save"}
            </span>
          </button>

          {/* Audio */}
          <button
            onClick={handleAudio}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 transition-all active:scale-95 ${
              isPlaying ? "bg-purple-500/20" : "bg-white/6"
            }`}
          >
            <span className="text-lg leading-none">{isPlaying ? "⏹️" : "🎧"}</span>
            <span className={`text-[9px] font-medium ${isPlaying ? "text-purple-400" : "text-white/40"}`}>
              {isNepali ? (isPlaying ? "रोक्नु" : "सुन्नु") : (isPlaying ? "Stop" : "Listen")}
            </span>
          </button>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(article.title + "\n\n" + article.summary.slice(0, 120) + "...\n\n" + article.sourceUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 bg-green-600/20 active:scale-95 transition-all"
          >
            <span className="text-lg leading-none">📱</span>
            <span className="text-[9px] font-medium text-green-400">WA</span>
          </a>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 bg-white/6 active:scale-95 transition-all"
          >
            <span className="text-lg leading-none">📤</span>
            <span className="text-[9px] font-medium text-white/40">
              {isNepali ? "शेयर" : "Share"}
            </span>
          </button>

          {/* Read full */}
          <button
            onClick={() => setShowDetail(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-1 bg-white/10 active:scale-95 transition-all"
          >
            <span className="text-lg leading-none">📖</span>
            <span className="text-[9px] font-medium text-white/60">
              {isNepali ? "पढ्नु" : "Read"}
            </span>
          </button>
        </div>
      </div>

      {/* ── FLASH EFFECTS ──────────────────────────────────── */}
      {likeFlash && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-[100px] drop-shadow-2xl" style={{ animation: "likeFlash 0.6s ease" }}>❤️</div>
        </div>
      )}
      {saveFlash && !likeFlash && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="bg-black/80 text-white px-5 py-2.5 rounded-2xl font-bold text-sm backdrop-blur-sm">
            {saved ? "🔖 Saved!" : "Removed"}
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL ───────────────────────────────────── */}
      {showDetail && (
        <div
          className="absolute inset-0 z-40 bg-[#0a0a0a] flex flex-col"
          onClick={() => setShowDetail(false)}
        >
          <div className="news-card-detail flex-1 p-5 pt-12 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDetail(false)}
              className="absolute top-4 left-4 flex items-center gap-2 text-white/40 text-sm"
            >
              ← {isNepali ? "फर्कनुहोस्" : "Back"}
            </button>

            {/* Image in detail */}
            <div className="rounded-2xl overflow-hidden mb-4" style={{ height: 200 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImage} alt={article.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {topicConfig && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: topicConfig.color }}>
                  {topicConfig.emoji} {isNepali ? topicConfig.labelNe : topicConfig.label}
                </span>
              )}
              <span className="text-white/40 text-xs">{article.sourceName}</span>
              <span className="text-white/25 text-xs">•</span>
              <span className="text-white/40 text-xs">{timeAgo(article.publishedAt, isNepali)}</span>
            </div>

            <h2 className="text-white text-xl font-black leading-snug mb-4">{article.title}</h2>
            <p className="text-white/75 text-[15px] leading-relaxed mb-4">{article.summary}</p>
            {article.fullContent && (
              <p className="text-white/55 text-sm leading-relaxed mb-4">{article.fullContent}</p>
            )}

            <div className="border-t border-white/10 pt-5 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                    saved ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-white/8 text-white border-white/15"
                  }`}
                >
                  {saved ? "🔖 Saved" : "📋 Save"}
                </button>
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-white text-black text-center"
                >
                  {isNepali ? "पूरा पढ्नुहोस् →" : "Read Full →"}
                </a>
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(article.title + "\n\n" + article.sourceUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-600 text-white text-center"
                >
                  📱 WhatsApp
                </a>
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/8 text-white border border-white/15"
                >
                  📤 {isNepali ? "सेयर" : "Share"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
