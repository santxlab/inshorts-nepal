"use client";
import { useState, useEffect } from "react";
import { TopicId } from "@/types";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useAuth } from "@/contexts/AuthContext";
import NewsFeed from "@/components/NewsFeed";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import BadgeToast from "@/components/BadgeToast";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import AuthScreen from "@/components/auth/AuthScreen";
import SavedPage from "@/components/pages/SavedPage";
import ProfilePage from "@/components/pages/ProfilePage";
import { usePushBehaviorSync } from "@/hooks/usePushNotifications";

type Tab = "home" | "discover" | "saved" | "profile";

export default function Home() {
  const { prefs, loaded } = useUserPrefs();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);

  // Keep push notification server updated with latest behavioral topic scores
  usePushBehaviorSync();

  // Track app open / install
  useEffect(() => {
    try {
      let deviceId = localStorage.getItem("_did");
      if (!deviceId) {
        deviceId = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem("_did", deviceId);
      }
      const platform = /android/i.test(navigator.userAgent) ? "android"
        : /iphone|ipad/i.test(navigator.userAgent) ? "ios" : "web";
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, platform, version: "1.0" }),
      }).catch(() => {});
    } catch { /* non-critical */ }
  }, []);

  // Wait for localStorage to hydrate
  if (!loaded || authLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="nepal-gradient w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-3xl">🇳🇵</span>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show onboarding if not completed
  if (!prefs.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  const headerHeight = prefs.topics.length > 0 ? "120px" : "70px";

  return (
    <main className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Badge unlock toast */}
      <BadgeToast />

      {/* Top header with language + topic chips */}
      <TopHeader
        activeTopics={prefs.topics}
        selectedTopic={selectedTopic}
        onTopicFilter={setSelectedTopic}
      />

      {/* Content area (padded for header + bottom nav) */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingTop: headerHeight, paddingBottom: "60px" }}
      >
        {activeTab === "home" && (
          <NewsFeed selectedTopic={selectedTopic} />
        )}
        {activeTab === "discover" && (
          <NewsFeed selectedTopic={null} />
        )}
        {activeTab === "saved" && <SavedPage />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </main>
  );
}
