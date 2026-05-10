"use client";
import { useState } from "react";
import { subscribeToNotifications } from "@/hooks/usePushNotifications";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onEnable: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function NotificationsStep({ onEnable, onSkip, onBack }: Props) {
  const { prefs } = useUserPrefs();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          // Full VAPID subscribe + behavior sync
          await subscribeToNotifications(
            user?.id ?? "anon",
            prefs.topics,
            prefs.language
          );
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
    onEnable();
  };

  return (
    <div className="flex flex-col h-full px-6 items-center justify-center text-center">
      <div className="text-7xl mb-6 animate-bounce">🔔</div>
      <h2 className="text-3xl font-bold text-white mb-3">Stay Updated</h2>
      <p className="text-white/80 text-lg mb-2">
        Never miss breaking news from Nepal
      </p>
      <p className="text-white/60 text-sm mb-8">
        ब्रेकिङ समाचार र महत्त्वपूर्ण अपडेटका लागि सूचना पाउनुहोस्
      </p>

      <div className="w-full space-y-3 mb-6">
        {[
          { emoji: "🚨", text: "Breaking news alerts (always delivered)" },
          { emoji: "📰", text: "Stories matching your interests (≤5/day)" },
          { emoji: "☀️", text: "Morning digest at 7 AM" },
          { emoji: "🌙", text: "Evening brief at 7 PM" },
          { emoji: "🏆", text: "Streak reminders if you haven't read yet" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 text-left">
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-white text-sm">{item.text}</span>
          </div>
        ))}
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-lg disabled:opacity-60"
        >
          {loading ? "Setting up…" : "🔔 Enable Notifications"}
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 text-white/60 text-sm"
        >
          Skip for now
        </button>
      </div>

      <button onClick={onBack} className="mt-4 text-white/40 text-sm">
        ← Back
      </button>
    </div>
  );
}
