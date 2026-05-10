"use client";
import { useUserPrefs } from "@/contexts/UserPrefsContext";

interface Props {
  articleCount: number;
}

export default function DigestBanner({ articleCount }: Props) {
  const { prefs } = useUserPrefs();
  const isNepali = prefs.language !== "en";

  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isEvening = hour >= 17 && hour < 22;

  if (!isMorning && !isEvening) return null;

  return (
    <div className="mx-4 mb-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#DC143C]/80 to-[#003893]/80 backdrop-blur-sm border border-white/10 flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">{isMorning ? "☀️" : "🌙"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">
          {isNepali
            ? (isMorning ? "बिहानको समाचार संक्षेप" : "साँझको समाचार संक्षेप")
            : (isMorning ? "Your Morning Brief" : "Your Evening Brief")}
        </p>
        <p className="text-white/60 text-xs truncate">
          {isNepali
            ? `${articleCount} ताजा समाचार तपाईंको लागि`
            : `${articleCount} fresh stories personalized for you`}
        </p>
      </div>
      <span className="text-white/40 text-lg flex-shrink-0">→</span>
    </div>
  );
}
