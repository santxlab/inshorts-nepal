"use client";
import { useUserPrefs } from "@/contexts/UserPrefsContext";

type Tab = "home" | "discover" | "saved" | "profile";

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  const { prefs } = useUserPrefs();
  const isNepali = prefs.language !== "en";

  const tabs: { id: Tab; emoji: string; label: string; labelNe: string }[] = [
    { id: "home",     emoji: "🏠", label: "Home",     labelNe: "गृह" },
    { id: "discover", emoji: "🔍", label: "Discover",  labelNe: "खोज्नु" },
    { id: "saved",    emoji: "🔖", label: "Saved",     labelNe: "सेव गरिएको" },
    { id: "profile",  emoji: "👤", label: "Profile",   labelNe: "प्रोफाइल" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-all ${
              active === tab.id ? "text-white" : "text-white/35"
            }`}
          >
            <span className={`text-xl transition-transform ${active === tab.id ? "scale-110" : ""}`}>
              {tab.emoji}
            </span>
            <span className={`text-[10px] font-semibold ${active === tab.id ? "text-red-400" : ""}`}>
              {isNepali ? tab.labelNe : tab.label}
            </span>
            {active === tab.id && (
              <div className="w-1 h-1 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
