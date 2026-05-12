"use client";
import { useState } from "react";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { Language, LANGUAGE_CONFIG, RegionId, REGION_CONFIG, SUPPORTED_LANGUAGES } from "@/types";

type Step = "language" | "region";

// Only show languages with enough RSS sources (>3).
// Currently: Nepali (31 sources) and English (15 sources).
const LANGUAGES = SUPPORTED_LANGUAGES.map((id) => ({
  id,
  flag:       LANGUAGE_CONFIG[id].flag,
  name:       LANGUAGE_CONFIG[id].label,
  nativeName: LANGUAGE_CONFIG[id].nativeLabel,
}));

const REGIONS: { id: RegionId }[] = [
  { id: "nepal" },
  { id: "kathmandu" },
  { id: "madhesh" },
  { id: "lumbini" },
  { id: "koshi" },
  { id: "gandaki" },
  { id: "karnali" },
  { id: "sudurpashchim" },
  { id: "international" },
];

export default function OnboardingWizard() {
  const { prefs, setLanguage, setRegion, completeOnboarding } = useUserPrefs();
  const [step, setStep] = useState<Step>("language");
  const [animating, setAnimating] = useState(false);

  const pickLanguage = (lang: Language) => {
    setLanguage(lang);
    setAnimating(true);
    setTimeout(() => { setStep("region"); setAnimating(false); }, 250);
  };

  const pickRegion = (region: RegionId) => {
    setRegion(region);
    completeOnboarding();
  };

  const skipRegion = () => {
    completeOnboarding();
  };

  const isNepali = prefs.language !== "en";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #1a0a0a 40%, #0a0a1a 100%)" }}
    >
      {/* Brand header */}
      <div className="flex-shrink-0 px-6 pt-12 pb-4 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="InShorts Nepal" className="w-10 h-10 rounded-xl shadow-lg" />
          <span className="text-white font-black text-xl tracking-tight">InShorts <span className="text-red-500">Nepal</span></span>
        </div>

        {step === "language" ? (
          <>
            <h2 className="text-white text-2xl font-black mb-1">Choose your language</h2>
            <p className="text-white/45 text-sm">आफ्नो भाषा छान्नुहोस्</p>
          </>
        ) : (
          <>
            <h2 className="text-white text-2xl font-black mb-1">Your region?</h2>
            <p className="text-white/45 text-sm">
              {isNepali ? "आफ्नो क्षेत्र छान्नुहोस्" : "Get local news tailored to you"}
            </p>
          </>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-4">
          {(["language", "region"] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-8 bg-red-500" : step === "region" && s === "language" ? "w-2 bg-white/40" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        className={`flex-1 overflow-y-auto px-4 pb-6 transition-opacity duration-200 ${animating ? "opacity-0" : "opacity-100"}`}
      >
        {step === "language" && (
          <div className="flex flex-col gap-4 pt-4 max-w-xs mx-auto w-full">
            {LANGUAGES.map((lang) => {
              const selected = prefs.language === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => pickLanguage(lang.id)}
                  className={`relative flex items-center gap-5 p-5 rounded-3xl border transition-all active:scale-95 text-left ${
                    selected
                      ? "bg-red-600/20 border-red-500 shadow-lg shadow-red-500/20"
                      : "bg-white/5 border-white/10 hover:border-white/25"
                  }`}
                >
                  <span className="text-5xl">{lang.flag}</span>
                  <div>
                    <div className="text-white font-black text-xl leading-tight">{lang.nativeName}</div>
                    <div className="text-white/45 text-sm mt-0.5">{lang.name}</div>
                  </div>
                  {selected && (
                    <span className="ml-auto w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step === "region" && (
          <>
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {REGIONS.map(({ id }) => {
                const cfg = REGION_CONFIG[id];
                const selected = prefs.region === id;
                return (
                  <button
                    key={id}
                    onClick={() => pickRegion(id)}
                    className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all active:scale-95 ${
                      selected
                        ? "bg-red-600/20 border-red-500"
                        : "bg-white/5 border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span className="text-3xl mb-1.5">{cfg.emoji}</span>
                    <span className="text-white font-bold text-[12px] leading-tight">
                      {isNepali ? cfg.labelNe : cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={skipRegion}
              className="w-full mt-5 py-3 text-white/35 text-sm font-medium"
            >
              {isNepali ? "छोड्नुहोस् →" : "Skip for now →"}
            </button>
          </>
        )}
      </div>

      {/* Bottom brand strip */}
      <div className="flex-shrink-0 pb-8 text-center">
        <p className="text-white/20 text-[11px]">
          {isNepali ? "नेपालको नम्बर १ समाचार एप" : "Nepal's premier news app"}
        </p>
      </div>
    </div>
  );
}
