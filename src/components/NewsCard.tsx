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

type SwipeHint = "save" | "more" | null;

export default function NewsCard({ article, index, total, isActive }: Props) {
  const { prefs, toggleSaved, isSaved } = useUserPrefs();
  const { onArticleRead, onShare, onSave } = useGamification();

  const saved = isSaved(article.id);
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [swipeHint, setSwipeHint] = useState<SwipeHint>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [likeFlash, setLikeFlash] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef<number>(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startReadTime = useRef<number>(Date.now());

  // Refs mirror interactive state so the cleanup closure can read current values
  const likedRef = useRef(false);
  const savedRef = useRef(isSaved(article.id));
  const sharedRef = useRef(false);
  const audioListenedRef = useRef(false);

  const isNepali = prefs.language !== "en";
  const topicConfig = article.topics?.[0] ? getTopicById(article.topics[0]) : null;

  // Keep refs in sync with state
  useEffect(() => { likedRef.current = liked; }, [liked]);
  useEffect(() => { savedRef.current = isSaved(article.id); }, [isSaved, article.id]);
  useEffect(() => { audioListenedRef.current = isPlaying; }, [isPlaying]);

  // Track read time + emit behavior signal when card deactivates
  useEffect(() => {
    if (!isActive) return;
    startReadTime.current = Date.now();
    return () => {
      const timeSpentMs = Date.now() - startReadTime.current;
      const readTimeMs = (article.readTimeSeconds ?? 60) * 1000;
      const readPercent = Math.min(100, Math.round((timeSpentMs / readTimeMs) * 100));
      const skipped = timeSpentMs < 3000 && readPercent < 20;

      // Gamification (only if actually read)
      if (timeSpentMs > 5000) onArticleRead();

      // Behavior signal — fire-and-forget on client side
      try {
        const profile = loadBehaviorProfile();
        const signal = createSignal(
          article.id,
          article.topics ?? [],
          article.language,
          {
            readPercent,
            timeSpentMs,
            liked: likedRef.current,
            saved: savedRef.current,
            shared: sharedRef.current,
            audioListened: audioListenedRef.current,
            skipped,
          }
        );
        const updated = recordSignal(profile, signal);
        saveBehaviorProfile(updated);
      } catch { /* non-critical */ }
    };
  }, [isActive, article, onArticleRead]);

  // Stop audio when card becomes inactive
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
    onSave(1);
  }, [article.id, toggleSaved, onSave]);

  const handleLike = useCallback(() => {
    setLiked((v) => !v);
    setLikeFlash(true);
    setTimeout(() => setLikeFlash(false), 700);
  }, []);

  const handleShare = useCallback(async () => {
    onShare();
    sharedRef.current = true;
    const text = `${article.title}\n\n${article.summary}\n\nSource: ${article.sourceName}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: article.title, text, url: article.sourceUrl });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* cancelled */ }
  }, [article, onShare]);

  const handleAudio = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const text = `${article.title}. ${article.summary}`;
    const utterance = new SpeechSynthesisUtterance(text);
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
    setSwipeDeltaX(0);
    holdTimer.current = setTimeout(() => {
      handleAudio();
    }, 700);
  }, [handleAudio]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setSwipeDeltaX(dx);
      setSwipeHint(dx > 30 ? "save" : dx < -30 ? "more" : null);
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const dt = Date.now() - touchStart.current.time;
    setSwipeDeltaX(0);
    setSwipeHint(null);

    const absDx = Math.abs(dx), absDy = Math.abs(dy);

    // Single tap → open detail (with delay to allow double-tap detection)
    // Double tap → like
    const now = Date.now();
    if (absDx < 10 && absDy < 10 && dt < 300) {
      if (now - lastTap.current < 350) {
        // Double tap — cancel pending single-tap open, trigger like
        if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
        handleLike();
        lastTap.current = 0;
        touchStart.current = null;
        return;
      }
      lastTap.current = now;
      // Single tap — open detail after short delay
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        setShowDetail(true);
      }, 280);
      touchStart.current = null;
      return;
    }

    if (absDx > absDy * 1.5) {
      if (dx > 60) handleSave();           // swipe right → save
      else if (dx < -60) setShowDetail(true); // swipe left → more
    }

    touchStart.current = null;
  }, [handleSave, handleLike]);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: "#0a0a0a" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background image */}
      {article.imageUrl ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
            style={{
              transform: swipeDeltaX ? `translateX(${swipeDeltaX * 0.08}px) scale(1.02)` : undefined,
              transition: swipeDeltaX ? "none" : "transform 0.3s ease",
            }}
          />
          <div className="img-overlay absolute inset-0" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 text-[200px]">
            {topicConfig?.emoji ?? "📰"}
          </div>
          <div className="img-overlay absolute inset-0" />
        </div>
      )}

      {/* Swipe overlays */}
      {swipeHint === "save" && (
        <div className="absolute inset-0 bg-emerald-500/25 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-emerald-500 text-white px-8 py-4 rounded-3xl text-2xl font-black shadow-2xl">
            🔖 Save
          </div>
        </div>
      )}
      {swipeHint === "more" && (
        <div className="absolute inset-0 bg-blue-500/25 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-blue-500 text-white px-8 py-4 rounded-3xl text-2xl font-black shadow-2xl">
            📖 More Context
          </div>
        </div>
      )}

      {/* Flash effects */}
      {likeFlash && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-[120px] drop-shadow-2xl" style={{ animation: "likeFlash 0.6s ease" }}>❤️</div>
        </div>
      )}
      {saveFlash && !likeFlash && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="bg-black/80 text-white px-6 py-3 rounded-2xl font-bold text-lg">
            {saved ? "🔖 Saved!" : "Removed"}
          </div>
        </div>
      )}

      {/* Breaking badge */}
      {article.isBreaking && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-black uppercase tracking-widest">Breaking</span>
        </div>
      )}

      {/* Progress dots + audio bars */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-1 items-center">
          {Array.from({ length: Math.min(total, 8) }).map((_, i) => {
            const mapped = Math.round((index / Math.max(total - 1, 1)) * 7);
            return (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === mapped ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/35"
                }`}
              />
            );
          })}
        </div>
        {isPlaying && (
          <div className="flex gap-0.5 items-end bg-black/40 px-2 py-1.5 rounded-full">
            {[3,5,4,6,3,5,4].map((h, i) => (
              <div
                key={i}
                className="w-0.5 bg-white rounded-full"
                style={{
                  height: `${h * 2}px`,
                  animation: `audioWave 0.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom content area */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-safe">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {topicConfig && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-lg"
              style={{ backgroundColor: topicConfig.color + "dd" }}
            >
              {topicConfig.emoji} {isNepali ? topicConfig.labelNe : topicConfig.label}
            </span>
          )}
          <span className="text-white/60 text-xs">{timeAgo(article.publishedAt, isNepali)}</span>
          {article.readTimeSeconds && (
            <span className="text-white/40 text-xs">• {Math.ceil(article.readTimeSeconds / 60)}m</span>
          )}
          {article.viewCount && (
            <span className="text-white/40 text-xs">• {(article.viewCount / 1000).toFixed(1)}k views</span>
          )}
        </div>

        {/* Source */}
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-full bg-white/20 text-center text-[10px] leading-5 flex-shrink-0">📰</span>
          <span className="text-white/75 text-xs font-medium">{article.sourceName}</span>
        </div>

        {/* Title */}
        <h2 className="text-white text-xl font-black leading-snug mb-2 drop-shadow-lg">
          {article.title}
        </h2>

        {/* Summary */}
        <p
          className={`text-white/80 text-sm leading-relaxed mb-3 cursor-pointer ${
            expanded ? "" : "line-clamp-3"
          }`}
          onClick={() => setExpanded((v) => !v)}
        >
          {article.summary}
        </p>
        {!expanded && article.summary.length > 140 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-white/45 text-xs mb-3 flex items-center gap-1"
          >
            {isNepali ? "थप पढ्नुहोस्" : "Read more"} <span>▼</span>
          </button>
        )}

        {/* Action row 1: Like | Save | Listen | Read More */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleLike}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              liked ? "bg-red-500/30 text-red-300 border border-red-500/40" : "bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            {liked ? "❤️" : "🤍"} {isNepali ? "लाइक" : "Like"}
          </button>

          <button
            onClick={handleSave}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              saved ? "bg-amber-500/30 text-amber-300 border border-amber-500/40" : "bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            {saved ? "🔖" : "📋"} {isNepali ? "सेव" : "Save"}
          </button>

          <button
            onClick={handleAudio}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              isPlaying ? "bg-purple-500/40 text-purple-200 border border-purple-500/40" : "bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            {isPlaying ? "⏹️" : "🎧"} {isNepali ? (isPlaying ? "रोक्नु" : "सुन्नु") : (isPlaying ? "Stop" : "Listen")}
          </button>

          <button
            onClick={() => setShowDetail(true)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold bg-white/20 text-white border border-white/30"
          >
            📖 {isNepali ? "पढ्नु" : "Read"}
          </button>
        </div>

        {/* Action row 2: Share buttons always visible */}
        <div className="flex items-center gap-2 mb-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(article.title + "\n\n" + article.summary.slice(0, 100) + "...\n\n" + article.sourceUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-green-600/80 text-white"
          >
            📱 WhatsApp
          </a>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white/80 border border-white/20"
          >
            📤 {isNepali ? "सेयर" : "Share"}
          </button>

          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold bg-red-600/80 text-white"
          >
            🔗 {isNepali ? "मूल" : "Source"}
          </a>
        </div>

        {/* Gesture hints (first card only) */}
        {index === 0 && (
          <div className="flex justify-center gap-6 pb-1 opacity-30">
            <span className="text-white text-[10px]">↑↓ {isNepali ? "स्वाइप" : "Swipe"}</span>
            <span className="text-white text-[10px]">→ {isNepali ? "सेव" : "Save"}</span>
            <span className="text-white text-[10px]">∥∥ {isNepali ? "होल्ड" : "Hold"}</span>
          </div>
        )}
      </div>

      {/* Full detail panel (swipe left) */}
      {showDetail && (
        <div
          className="absolute inset-0 z-40 bg-black/96 flex flex-col"
          onClick={() => setShowDetail(false)}
        >
          <div className="news-card-detail flex-1 p-5 pt-10" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDetail(false)}
              className="text-white/50 text-sm mb-6 flex items-center gap-2"
            >
              ← {isNepali ? "फर्कनुहोस्" : "Back"}
            </button>

            <div className="flex flex-wrap gap-2 mb-4">
              {topicConfig && (
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: topicConfig.color }}
                >
                  {topicConfig.emoji} {isNepali ? topicConfig.labelNe : topicConfig.label}
                </span>
              )}
              <span className="text-white/50 text-xs self-center">{timeAgo(article.publishedAt, isNepali)}</span>
            </div>

            <h2 className="text-white text-2xl font-black leading-snug mb-4">{article.title}</h2>

            <p className="text-white/80 text-base leading-relaxed mb-4">{article.summary}</p>

            {article.fullContent && (
              <p className="text-white/65 text-sm leading-relaxed mb-4">{article.fullContent}</p>
            )}

            <div className="border-t border-white/10 pt-5 mt-4 space-y-3">
              <p className="text-white/40 text-xs">
                {isNepali ? "प्रकाशित" : "Published by"}: {article.sourceName}
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleSave}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                    saved ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-white/10 text-white border-white/20"
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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white border border-white/20"
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
