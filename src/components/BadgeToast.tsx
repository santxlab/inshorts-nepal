"use client";
import { useEffect } from "react";
import { useGamification } from "@/contexts/GamificationContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";

export default function BadgeToast() {
  const { newBadges, clearNewBadges } = useGamification();
  const { prefs } = useUserPrefs();
  const isNepali = prefs.language !== "en";

  useEffect(() => {
    if (newBadges.length > 0) {
      const timer = setTimeout(clearNewBadges, 4000);
      return () => clearTimeout(timer);
    }
  }, [newBadges, clearNewBadges]);

  if (newBadges.length === 0) return null;

  const badge = newBadges[0];

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
        <span className="text-3xl">{badge.emoji}</span>
        <div>
          <p className="font-black text-sm">
            {isNepali ? "नयाँ ब्याज!" : "Badge Unlocked!"}
          </p>
          <p className="text-white/90 text-xs">
            {isNepali ? badge.labelNe : badge.label}
          </p>
        </div>
        <span className="text-yellow-200 font-bold text-sm">🏆</span>
      </div>
    </div>
  );
}
