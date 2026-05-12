"use client";
import { useState } from "react";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { LANGUAGE_CONFIG, Language, TopicId, SUPPORTED_LANGUAGES } from "@/types";
import { TOPICS } from "@/lib/topics-config";
import StreakWidget from "./StreakWidget";

interface Props {
  activeTopics: TopicId[];
  onTopicFilter: (t: TopicId | null) => void;
  selectedTopic: TopicId | null;
}

export default function TopHeader({ onTopicFilter, selectedTopic }: Props) {
  const { prefs, setLanguage } = useUserPrefs();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const isNepali = prefs.language !== "en";

  const langConfig = LANGUAGE_CONFIG[prefs.language];
  const visibleTopics = TOPICS.filter((t) => prefs.topics.includes(t.id));

  return (
    <div className="fixed top-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/8">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🇳🇵</span>
          <div>
            <span className="text-white font-black text-lg leading-none">InShort</span>
            <span className="text-red-400 text-lg font-black leading-none"> Nepal</span>
          </div>
        </div>

        <StreakWidget />

        {/* Language toggle */}
        <button
          onClick={() => setShowLangPicker((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold"
        >
          <span>{langConfig.flag}</span>
          <span>{langConfig.nativeLabel.split(" ")[0]}</span>
          <span className="text-white/40">▾</span>
        </button>
      </div>

      {/* Language picker dropdown */}
      {showLangPicker && (
        <div className="absolute top-full right-0 mt-1 mr-2 bg-gray-950 border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden w-52">
          {(SUPPORTED_LANGUAGES as Language[]).map((lang) => {
            const cfg = LANGUAGE_CONFIG[lang];
            return (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); setShowLangPicker(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  prefs.language === lang ? "bg-red-900/30 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span className="text-lg">{cfg.flag}</span>
                <div>
                  <div className="text-sm font-semibold">{cfg.nativeLabel}</div>
                  <div className="text-xs text-white/40">{cfg.label}</div>
                </div>
                {prefs.language === lang && <span className="ml-auto text-red-400">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Topic chips */}
      {visibleTopics.length > 0 && (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onTopicFilter(null)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedTopic === null
                ? "bg-red-600 text-white"
                : "bg-white/10 text-white/60"
            }`}
          >
            {isNepali ? "सबै" : "All"}
          </button>
          {visibleTopics.map((t) => (
            <button
              key={t.id}
              onClick={() => onTopicFilter(selectedTopic === t.id ? null : t.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedTopic === t.id
                  ? "text-white"
                  : "bg-white/10 text-white/60"
              }`}
              style={selectedTopic === t.id ? { backgroundColor: t.color } : {}}
            >
              <span>{t.emoji}</span>
              <span>{isNepali ? t.labelNe : t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
