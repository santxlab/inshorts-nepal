"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { NewsArticle } from "@/types";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useGamification } from "@/contexts/GamificationContext";
import { getTopicById } from "@/lib/topics-config";
import { createSignal, recordSignal, loadBehaviorProfile, saveBehaviorProfile } from "@/lib/behavior";
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
  const [liked, setLiked] = useState(false);
  const [likeFlash, setLikeFlash] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Canonical share URL — always links to our app
  const appUrl = typeof window !== "undefined"
    ? `${window.location.origin}/news/${article.id}`
    : `https://inshortsnepal.org/news/${article.id}`;

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
  const rawImage = imgError || !article.imageUrl
    ? getFallbackImage(article.id, article.topics ?? [], article.category)
    : article.imageUrl;
  // Proxy external images to fix HTTPS mixed-content + hotlink issues
  const displayImage = rawImage.startsWith("http")
    ? `/api/image-proxy?url=${encodeURIComponent(rawImage)}`
    : rawImage;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimer.current) { clearTimeout(singleTapTimer.current); singleTapTimer.current = null; }
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => { likedRef.current = liked; }, [liked]);
  useEffect(() => { savedRef.current = isSaved(article.id); }, [isSaved, article.id]);
  useEffect(() => { audioListenedRef.current = isPlaying; }, [isPlaying]);

  // Track read time + behavior
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

  useEffect(() => {
    if (!isActive && isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  const handleSave = useCallback(() => {
    toggleSaved(article.id);
    const newCount = saved ? prefs.savedArticleIds.length - 1 : prefs.savedArticleIds.length + 1;
    onSave(newCount);
    if (!saved) recordBookmark();
  }, [article.id, toggleSaved, onSave, saved, prefs.savedArticleIds.length]);

  const handleLike = useCallback(() => {
    setLiked((v) => !v);
    setLikeFlash(true);
    setTimeout(() => setLikeFlash(false), 600);
  }, []);

  const handleShare = useCallback(async () => {
    onShare();
    sharedRef.current = true;
    recordEngShare();
    const text = `${article.title}\n\nRead on InShorts Nepal: ${appUrl}`;
    try {
      if (navigator.share) await navigator.share({ title: article.title, text, url: appUrl });
      else await navigator.clipboard.writeText(appUrl);
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
    const now = Date.now();

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) {
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
      className="relative w-full h-full flex flex-col overflow-hidden select-none bg-white"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── IMAGE (top ~52%) ──────────────────────────────────── */}
      <div className="relative flex-shrink-0" style={{ height: "52%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImage}
          alt={article.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />

        {/* Top row: Breaking badge + progress dots */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3 pt-3">
          {article.isBreaking ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest">Breaking</span>
            </div>
          ) : <div />}

          {/* Progress dots */}
          <div className="flex gap-1 items-center">
            {Array.from({ length: Math.min(total, 6) }).map((_, i) => {
              const mapped = Math.round((index / Math.max(total - 1, 1)) * 5);
              return (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === mapped ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom of image: source name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-bold opacity-90">{article.sourceName}</span>
            <div className="flex items-center gap-3">
              {/* Bookmark */}
              <button
                onClick={handleSave}
                className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm active:scale-90 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "white" : "none"} stroke="white" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
              {/* Share */}
              <button
                onClick={handleShare}
                className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm active:scale-90 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Audio indicator */}
        {isPlaying && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-0.5 items-end bg-black/60 px-3 py-1.5 rounded-full">
            {[3, 5, 4, 6, 3].map((h, i) => (
              <div key={i} className="w-0.5 bg-white rounded-full"
                style={{ height: `${h * 2}px`, animation: `audioWave 0.8s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENT PANEL (white, like Inshorts) ──────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">

        {/* Topic tag */}
        {topicConfig && (
          <div className="px-4 pt-3 pb-1">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: topicConfig.color }}
            >
              {topicConfig.emoji} {isNepali ? topicConfig.labelNe : topicConfig.label}
            </span>
          </div>
        )}

        {/* Title */}
        <div className="px-4 pt-2">
          <h2 className="text-[#1a1a1a] text-[17px] font-black leading-snug">
            {article.title}
          </h2>
        </div>

        {/* Summary — scrollable */}
        <div className="flex-1 px-4 pt-2 min-h-0 overflow-y-auto">
          <p className="text-[#444] text-[14px] leading-relaxed">
            {article.summary}
          </p>
        </div>

        {/* Meta row: time + audio button */}
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[#999] text-[12px]">
            {timeAgo(article.publishedAt, isNepali)}
          </span>
          <button
            onClick={handleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
              isPlaying ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
            }`}
          >
            <span>{isPlaying ? "⏹" : "🎧"}</span>
            <span>{isNepali ? (isPlaying ? "रोक्नु" : "सुन्नु") : (isPlaying ? "Stop" : "Listen")}</span>
          </button>
        </div>

        {/* Bottom strip — "Read more" like Inshorts */}
        <div className="border-t border-gray-100">
          <div className="flex items-center">
            <button
              onClick={() => setShowDetail(true)}
              className="flex-1 py-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#e63946] active:bg-red-50 transition-all"
            >
              {isNepali ? "पूरा पढ्नुहोस् →" : "Read more →"}
            </button>
            <div className="w-px h-8 bg-gray-100" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(article.title + "\n\nRead on InShorts Nepal: " + appUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 flex items-center gap-1.5 text-[13px] font-semibold text-green-600 active:bg-green-50 transition-all"
            >
              <span>📱</span>
              <span>WA</span>
            </a>
            <div className="w-px h-8 bg-gray-100" />
            <button
              onClick={handleLike}
              className="px-5 py-3 flex items-center gap-1.5 text-[13px] font-semibold active:bg-gray-50 transition-all"
            >
              <span>{liked ? "❤️" : "🤍"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── LIKE FLASH ────────────────────────────────────────── */}
      {likeFlash && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-[90px] drop-shadow-2xl" style={{ animation: "likeFlash 0.6s ease" }}>❤️</div>
        </div>
      )}

      {/* ── DETAIL PANEL ──────────────────────────────────────── */}
      {showDetail && (
        <div className="absolute inset-0 z-40 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setShowDetail(false)}
              className="flex items-center gap-1 text-[#e63946] text-sm font-semibold"
            >
              ← {isNepali ? "फर्कनुहोस्" : "Back"}
            </button>
            <span className="flex-1 text-[#999] text-xs text-center truncate">{article.sourceName}</span>
            <button onClick={handleSave}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? "#e63946" : "none"} stroke={saved ? "#e63946" : "#999"} strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Image */}
            <div className="w-full" style={{ height: 220 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImage} alt={article.title} className="w-full h-full object-cover" />
            </div>

            <div className="px-4 pt-4 pb-6">
              {/* Topic + time */}
              <div className="flex items-center gap-2 mb-3">
                {topicConfig && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: topicConfig.color }}>
                    {topicConfig.emoji} {isNepali ? topicConfig.labelNe : topicConfig.label}
                  </span>
                )}
                <span className="text-[#999] text-[12px]">{timeAgo(article.publishedAt, isNepali)}</span>
              </div>

              {/* Title */}
              <h2 className="text-[#1a1a1a] text-xl font-black leading-snug mb-3">{article.title}</h2>

              {/* Summary */}
              <p className="text-[#444] text-[15px] leading-relaxed mb-4">{article.summary}</p>

              {article.fullContent && (
                <p className="text-[#666] text-[14px] leading-relaxed mb-4">{article.fullContent}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 active:scale-95 transition-all"
                >
                  📤 {isNepali ? "शेयर" : "Share"}
                </button>
                <button
                  onClick={() => setShowWebView(true)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#e63946] text-white text-center active:scale-95 transition-all"
                >
                  {isNepali ? "पूरा पढ्नुहोस् →" : "Read Full →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── In-app WebView ── */}
      {showWebView && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => setShowWebView(false)}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{article.title}</p>
              <p className="text-white/40 text-[10px] truncate">{article.sourceUrl}</p>
            </div>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 text-xs px-2 py-1 rounded-lg bg-white/10"
            >
              ↗
            </a>
          </div>
          {/* iframe */}
          <iframe
            src={article.sourceUrl}
            className="flex-1 w-full border-none"
            title={article.title}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      )}
    </div>
  );
}
