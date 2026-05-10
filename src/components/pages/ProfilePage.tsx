"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useGamification } from "@/contexts/GamificationContext";
import { getRank, ALL_BADGES } from "@/lib/gamification";
import { LANGUAGE_CONFIG } from "@/types";
import { useState, useEffect } from "react";

function ReferralSection({ userId, isNepali }: { userId: string; isNepali: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/referral/code?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setCode(d.code))
      .catch(() => {});
  }, [userId]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = code ? `${baseUrl}/refer/${code}` : "";

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const share = async () => {
    if (!referralLink) return;
    const text = isNepali
      ? `म InShorts Nepal प्रयोग गर्दैछु! तपाईं पनि सामेल हुनुहोस् र 💎 हीरा पाउनुहोस्: ${referralLink}`
      : `I'm using InShorts Nepal for the best Nepal news! Join me and earn 💎 diamonds: ${referralLink}`;
    try {
      if (navigator.share) await navigator.share({ title: "InShorts Nepal", text, url: referralLink });
      else copy();
    } catch { /* cancelled */ }
  };

  return (
    <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">👥</span>
        <h3 className="text-white font-bold">{isNepali ? "साथीहरूलाई निम्तो गर्नुहोस्" : "Refer Friends"}</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold">+20 💎</span>
      </div>
      <p className="text-white/60 text-xs mb-3">
        {isNepali ? "प्रत्येक साथीले साइन अप गर्दा तपाईंले र उनीहरूले हीरा पाउनुहुन्छ।" : "You and your friend both earn diamonds when they sign up."}
      </p>
      {code ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-black/40 rounded-xl px-3 py-2 font-mono text-white text-sm truncate">
              {referralLink}
            </div>
            <button
              onClick={copy}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${copied ? "bg-green-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={share}
              className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold"
            >
              📱 {isNepali ? "WhatsApp मा सेयर" : "Share on WhatsApp"}
            </button>
            <span className="px-3 py-2 rounded-xl bg-white/10 text-white/50 text-xs self-center font-mono">
              {code}
            </span>
          </div>
        </>
      ) : (
        <div className="text-center py-3 text-white/40 text-sm">
          {isNepali ? "साइन इन गर्नुहोस्..." : "Sign in to get your referral code"}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { prefs, resetPrefs } = useUserPrefs();
  const { gami } = useGamification();
  const isNepali = prefs.language !== "en";
  const rank = getRank(gami.xp);
  const langCfg = LANGUAGE_CONFIG[prefs.language];

  const earnedBadges = ALL_BADGES.filter((b) => gami.badges.includes(b.id));
  const lockedBadges = ALL_BADGES.filter((b) => !gami.badges.includes(b.id));

  return (
    <div className="flex-1 bg-black overflow-y-auto pb-20">
      {/* Hero */}
      <div className="nepal-gradient px-6 pt-6 pb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mx-auto mb-3 text-4xl">
          {user?.isGuest ? "👤" : user?.name.charAt(0).toUpperCase() ?? "👤"}
        </div>
        <h2 className="text-white font-black text-xl">{user?.name ?? "Guest"}</h2>
        <p className="text-white/60 text-sm">{user?.email || (isNepali ? "अतिथि प्रयोगकर्ता" : "Guest user")}</p>
        <div className="flex items-center justify-center gap-2 mt-2 px-4 py-2 bg-black/20 rounded-full mx-auto w-fit">
          <span>{rank.emoji}</span>
          <span className="text-white font-bold text-sm">{rank.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-0 border-b border-white/10">
        {[
          { label: isNepali ? "पढेको" : "Read", value: gami.articlesRead, emoji: "📖" },
          { label: isNepali ? "लगातार" : "Streak", value: `${gami.streak.current}🔥`, emoji: "" },
          { label: isNepali ? "हीरा" : "Diamonds", value: gami.diamonds, emoji: "💎" },
          { label: isNepali ? "ब्याज" : "Badges", value: earnedBadges.length, emoji: "🏅" },
        ].map((s) => (
          <div key={s.label} className="text-center py-4 border-r border-white/10 last:border-r-0">
            <div className="text-white font-black text-xl">{s.value}</div>
            <div className="text-white/40 text-[10px]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak detail */}
      <div className="mx-4 mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🔥</span>
          <h3 className="text-white font-bold">{isNepali ? "पठन लगातार" : "Reading Streak"}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-white font-black text-2xl">{gami.streak.current}</div>
            <div className="text-white/40 text-xs">{isNepali ? "हालको" : "Current"}</div>
          </div>
          <div>
            <div className="text-white font-black text-2xl">{gami.streak.longest}</div>
            <div className="text-white/40 text-xs">{isNepali ? "सर्वश्रेष्ठ" : "Best"}</div>
          </div>
          <div>
            <div className="text-white font-black text-2xl">{gami.streak.totalDays}</div>
            <div className="text-white/40 text-xs">{isNepali ? "जम्मा दिन" : "Total days"}</div>
          </div>
        </div>
        {/* Progress to next milestone */}
        {gami.streak.current > 0 && (
          <div className="mt-3">
            {[3, 7, 30, 100].map((milestone) => {
              if (gami.streak.current >= milestone) return null;
              const pct = Math.min(100, (gami.streak.current / milestone) * 100);
              return (
                <div key={milestone}>
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>{isNepali ? "अर्को लक्ष्य" : "Next goal"}: {milestone} {isNepali ? "दिन" : "days"}</span>
                    <span>{gami.streak.current}/{milestone}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="mx-4 mt-4">
        <h3 className="text-white font-bold mb-3">
          {isNepali ? `ब्याजहरू (${earnedBadges.length}/${ALL_BADGES.length})` : `Badges (${earnedBadges.length}/${ALL_BADGES.length})`}
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {ALL_BADGES.map((badge) => {
            const earned = gami.badges.includes(badge.id);
            return (
              <div key={badge.id} className="text-center">
                <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-1 border-2 transition-all ${
                  earned
                    ? "bg-yellow-500/20 border-yellow-500/50"
                    : "bg-white/5 border-white/10 opacity-30"
                }`}>
                  {badge.emoji}
                </div>
                <p className={`text-[9px] leading-tight ${earned ? "text-white/70" : "text-white/25"}`}>
                  {isNepali ? badge.labelNe : badge.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral section */}
      {user && !user.isGuest && (
        <ReferralSection userId={user.id} isNepali={isNepali} />
      )}

      {/* Language setting */}
      <div className="mx-4 mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{langCfg.flag}</span>
          <div>
            <p className="text-white text-sm font-semibold">{langCfg.nativeLabel}</p>
            <p className="text-white/40 text-xs">{isNepali ? "हालको भाषा" : "Current language"}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-4 mt-4 space-y-2 pb-6">
        {user && !user.isGuest && (
          <button
            onClick={signOut}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-semibold"
          >
            {isNepali ? "साइन आउट" : "Sign Out"}
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(isNepali ? "के तपाईं सबै प्राथमिकताहरू रिसेट गर्न चाहनुहुन्छ?" : "Reset all preferences?")) {
              resetPrefs();
            }
          }}
          className="w-full py-3 rounded-xl bg-red-900/20 border border-red-800/30 text-red-400 text-sm font-semibold"
        >
          {isNepali ? "प्राथमिकताहरू रिसेट गर्नुहोस्" : "Reset Preferences"}
        </button>
      </div>
    </div>
  );
}
