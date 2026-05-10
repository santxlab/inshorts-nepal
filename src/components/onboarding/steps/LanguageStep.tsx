"use client";
import { Language, LANGUAGE_CONFIG } from "@/types";

interface Props {
  selected: Language;
  onSelect: (l: Language) => void;
  onNext: () => void;
}

const LANGUAGES = Object.entries(LANGUAGE_CONFIG) as [Language, typeof LANGUAGE_CONFIG[Language]][];

export default function LanguageStep({ selected, onSelect, onNext }: Props) {
  return (
    <div className="flex flex-col h-full px-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🇳🇵</div>
        <h1 className="text-3xl font-bold text-white mb-2">नमस्ते!</h1>
        <p className="text-white/80 text-lg">Choose your language</p>
        <p className="text-white/60 text-sm">आफ्नो भाषा छान्नुहोस्</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map(([lang, cfg]) => (
            <button
              key={lang}
              onClick={() => onSelect(lang)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                selected === lang
                  ? "border-white bg-white/20 shadow-lg scale-[1.02]"
                  : "border-white/20 bg-white/8 hover:bg-white/15"
              }`}
            >
              <span className="text-2xl">{cfg.flag}</span>
              <div>
                <div className="text-white font-semibold text-sm">{cfg.nativeLabel}</div>
                <div className="text-white/60 text-xs">{cfg.label}</div>
              </div>
              {selected === lang && (
                <div className="ml-auto w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <span className="text-[#DC143C] text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="py-6">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-lg active:scale-[0.98] transition-transform"
        >
          Continue →
        </button>
        <p className="text-center text-white/50 text-xs mt-3">
          You can change this anytime in settings
        </p>
      </div>
    </div>
  );
}
