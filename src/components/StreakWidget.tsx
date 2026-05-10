"use client";
import { useGamification } from "@/contexts/GamificationContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { getRank } from "@/lib/gamification";

export default function StreakWidget() {
  const { gami } = useGamification();
  const { prefs } = useUserPrefs();
  const isNepali = prefs.language !== "en";
  const rank = getRank(gami.xp);

  if (gami.streak.current === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
      <span className="text-base">🔥</span>
      <span className="text-white font-bold text-sm">{gami.streak.current}</span>
      <span className="text-white/50 text-xs">{isNepali ? "दिन" : "day streak"}</span>
      <div className="w-px h-3 bg-white/20" />
      <span className="text-yellow-400 text-xs font-bold">💎 {gami.diamonds}</span>
      <div className="w-px h-3 bg-white/20" />
      <span className="text-xs">{rank.emoji}</span>
    </div>
  );
}
