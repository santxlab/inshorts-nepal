"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import {
  loadEngagement, markPromptShown, getNextPrompt, PromptId,
} from "@/lib/engagement";

interface PromptConfig {
  emoji: string;
  title: string;
  titleNe: string;
  body: string;
  bodyNe: string;
  cta: string;
  ctaNe: string;
  secondary: string;
  secondaryNe: string;
  action: "signup" | "signin" | "dismiss";
}

const PROMPTS: Record<PromptId, PromptConfig> = {
  save_prefs: {
    emoji: "⚡",
    title: "Save your preferences",
    titleNe: "प्राथमिकता सुरक्षित गर्नुहोस्",
    body: "Create a free account to save your language, region, and reading preferences.",
    bodyNe: "निःशुल्क खाता बनाएर आफ्नो भाषा र प्राथमिकता सुरक्षित गर्नुहोस्।",
    cta: "Create free account",
    ctaNe: "निःशुल्क खाता खोल्नुहोस्",
    secondary: "Not now",
    secondaryNe: "अहिले होइन",
    action: "signup",
  },
  create_account: {
    emoji: "🧠",
    title: "Smarter recommendations",
    titleNe: "स्मार्ट सिफारिसहरू",
    body: "Sign up so InShorts Nepal can learn your interests and show you better stories.",
    bodyNe: "साइन अप गर्नुहोस् र तपाईंको रुचि अनुसार स्मार्ट समाचार पाउनुहोस्।",
    cta: "Sign up — it's free",
    ctaNe: "साइन अप गर्नुहोस् — निःशुल्क",
    secondary: "Maybe later",
    secondaryNe: "पछि",
    action: "signup",
  },
  sync_bookmarks: {
    emoji: "🔖",
    title: "Sync your bookmarks",
    titleNe: "बुकमार्क सिंक गर्नुहोस्",
    body: "You've saved articles! Create an account to access them from any device.",
    bodyNe: "तपाईंले लेखहरू सेव गर्नुभयो! खाता बनाएर जुनसुकै डिभाइसबाट हेर्नुहोस्।",
    cta: "Save bookmarks",
    ctaNe: "बुकमार्क सुरक्षित गर्नुहोस्",
    secondary: "Keep local only",
    secondaryNe: "स्थानीय राख्नुहोस्",
    action: "signup",
  },
  share_app: {
    emoji: "📢",
    title: "Enjoying InShorts Nepal?",
    titleNe: "InShorts Nepal मन पर्यो?",
    body: "Share it with friends and family to spread Nepal's news.",
    bodyNe: "साथीभाइसँग शेयर गरेर नेपालको समाचार फैलाउनुहोस्।",
    cta: "Share the app",
    ctaNe: "एप शेयर गर्नुहोस्",
    secondary: "Not now",
    secondaryNe: "अहिले होइन",
    action: "dismiss",
  },
  smart_recs: {
    emoji: "🎯",
    title: "Your feed is getting smarter",
    titleNe: "तपाईंको फिड स्मार्ट भइरहेको छ",
    body: "Sign in to supercharge personalization and never miss breaking news.",
    bodyNe: "साइन इन गरेर आफ्नो अनुभव अझ राम्रो बनाउनुहोस्।",
    cta: "Sign in",
    ctaNe: "साइन इन गर्नुहोस्",
    secondary: "Continue as guest",
    secondaryNe: "पाहुनाको रूपमा जारी राख्नुहोस्",
    action: "signin",
  },
  streak_start: {
    emoji: "🔥",
    title: "You're on a reading streak!",
    titleNe: "तपाईंको पढ्ने लत बढ्दैछ!",
    body: "Sign in to track your streak and earn badges as a loyal reader.",
    bodyNe: "साइन इन गरेर आफ्नो स्ट्रिक ट्र्याक गर्नुहोस् र ब्याज कमाउनुहोस्।",
    cta: "Track my streak",
    ctaNe: "मेरो स्ट्रिक ट्र्याक गर्नुहोस्",
    secondary: "Skip",
    secondaryNe: "छोड्नुहोस्",
    action: "signup",
  },
};

export default function EngagementPrompt() {
  const { isAuthenticated } = useAuth();
  const { prefs } = useUserPrefs();
  const [promptId, setPromptId] = useState<PromptId | null>(null);
  const [visible, setVisible] = useState(false);

  const isNepali = prefs.language !== "en";

  useEffect(() => {
    if (isAuthenticated) return; // don't show to signed-in users
    // Check after 2 seconds so feed loads first
    const t = setTimeout(() => {
      const state = loadEngagement();
      const next = getNextPrompt(state);
      if (next) {
        setPromptId(next);
        setVisible(true);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [isAuthenticated]);

  const dismiss = () => {
    if (promptId) markPromptShown(promptId);
    setVisible(false);
  };

  const handleCta = async () => {
    const cfg = promptId ? PROMPTS[promptId] : null;
    if (!cfg) { dismiss(); return; }

    if (cfg.action === "dismiss") {
      // Share app
      try {
        if (navigator.share) {
          await navigator.share({ title: "InShorts Nepal", text: "Nepal's best news app!", url: "https://inshortsnepal.org" });
        } else {
          await navigator.clipboard.writeText("https://inshortsnepal.org");
        }
      } catch { /* cancelled */ }
    }
    // For signin/signup: could open auth modal, for now just dismiss
    dismiss();
  };

  if (!visible || !promptId) return null;
  const cfg = PROMPTS[promptId];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl"
        style={{ animation: "fadeSlideUp 0.35s ease-out" }}
      >
        <div className="text-center mb-4">
          <span className="text-5xl">{cfg.emoji}</span>
        </div>
        <h3 className="text-white font-black text-xl text-center mb-2">
          {isNepali ? cfg.titleNe : cfg.title}
        </h3>
        <p className="text-white/55 text-sm text-center leading-relaxed mb-6">
          {isNepali ? cfg.bodyNe : cfg.body}
        </p>

        <button
          onClick={handleCta}
          className="w-full py-3.5 rounded-2xl bg-red-600 text-white font-bold text-base mb-3 active:scale-95 transition-all"
        >
          {isNepali ? cfg.ctaNe : cfg.cta}
        </button>
        <button
          onClick={dismiss}
          className="w-full py-2.5 text-white/40 text-sm"
        >
          {isNepali ? cfg.secondaryNe : cfg.secondary}
        </button>
      </div>
    </div>
  );
}
