"use client";
import { useState } from "react";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { Language, LANGUAGE_CONFIG, Province } from "@/types";
import { PROVINCES } from "@/lib/locations";
import { TOPICS } from "@/lib/topics-config";
import LanguageStep from "./steps/LanguageStep";
import LocationStep from "./steps/LocationStep";
import TopicsStep from "./steps/TopicsStep";
import NotificationsStep from "./steps/NotificationsStep";

const STEPS = ["language", "location", "topics", "notifications"] as const;
type Step = typeof STEPS[number];

export default function OnboardingWizard() {
  const { prefs, setLanguage, setProvince, setDistrict, setCity, setTopics, setNotifications, completeOnboarding } = useUserPrefs();
  const [step, setStep] = useState<Step>("language");
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward");

  const currentIndex = STEPS.indexOf(step);

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setAnimDir("forward");
      setStep(STEPS[currentIndex + 1]);
    } else {
      completeOnboarding();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setAnimDir("back");
      setStep(STEPS[currentIndex - 1]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#DC143C] via-[#8B0000] to-[#003893] flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-12 pb-4">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-8 bg-white"
                : i < currentIndex
                ? "w-2 bg-white/60"
                : "w-2 bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {step === "language" && (
          <LanguageStep
            selected={prefs.language}
            onSelect={setLanguage}
            onNext={goNext}
          />
        )}
        {step === "location" && (
          <LocationStep
            province={prefs.province}
            district={prefs.district}
            city={prefs.city}
            onProvince={setProvince}
            onDistrict={setDistrict}
            onCity={setCity}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === "topics" && (
          <TopicsStep
            selected={prefs.topics}
            onTopics={setTopics}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === "notifications" && (
          <NotificationsStep
            onEnable={() => { setNotifications(true); goNext(); }}
            onSkip={() => { setNotifications(false); goNext(); }}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  );
}
