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
import EngagementPrompt from "@/components/EngagementPrompt";
import SavedPage from "@/components/pages/SavedPage";
import ProfilePage from "@/components/pages/ProfilePage";
import DiscoverPage from "@/components/pages/DiscoverPage";
import { usePushBehaviorSync } from "@/hooks/usePushNotifications";
import { recordSession } from "@/lib/engagement";

type Tab = "home" | "discover" | "saved" | "profile";

export default function Home() {
  const { prefs, loaded } = useUserPrefs();
  const { isAuthenticated, openAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedTopic, setSelectedTopic] = useState<TopicId | null>(null);

  // First-launch discoverability: once onboarding is done, show the sign-in
  // screen ONE time to guests (they can still "Continue as Guest"). Without this
  // the only way to find sign-in was to dig into the Profile tab, which users
  // missed. Guarded by a localStorage flag so we never nag on later opens.
  useEffect(() => {
    if (!loaded || !prefs.onboardingCompleted || isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("auth-first-prompt-done")) return;
    localStorage.setItem("auth-first-prompt-done", "1");
    const t = setTimeout(() => openAuth(), 700);
    return () => clearTimeout(t);
  }, [loaded, prefs.onboardingCompleted, isAuthenticated, openAuth]);

  // Keep push notification server updated with behavioral topic scores
  usePushBehaviorSync();

  // Discover page dispatches this event when a topic chip is tapped — jump to
  // Home with that topic preselected.
  useEffect(() => {
    function onOpenTopic(e: Event) {
      const id = (e as CustomEvent<TopicId>).detail;
      setSelectedTopic(id);
      setActiveTab("home");
    }
    window.addEventListener("inshorts:openTopic", onOpenTopic);
    return () => window.removeEventListener("inshorts:openTopic", onOpenTopic);
  }, []);

  // Track session + device install on every app open
  useEffect(() => {
    // Record session for engagement prompt logic
    recordSession();

    // Track device for admin analytics
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
  if (!loaded) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="nepal-gradient w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-3xl">🇳🇵</span>
        </div>
      </div>
    );
  }

  // Show onboarding if not completed (no auth gate — everyone gets the feed)
  if (!prefs.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  const headerHeight = prefs.topics.length > 0 ? "120px" : "70px";

  return (
    <main className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Badge unlock toast */}
      <BadgeToast />

      {/* Deferred engagement / auth prompts */}
      <EngagementPrompt />

      {/* Top header with language + topic chips */}
      <TopHeader
        activeTopics={prefs.topics}
        selectedTopic={selectedTopic}
        onTopicFilter={setSelectedTopic}
      />

      {/* Content area */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingTop: headerHeight, paddingBottom: "60px" }}
      >
        {activeTab === "home" && (
          <NewsFeed selectedTopic={selectedTopic} />
        )}
        {activeTab === "discover" && <DiscoverPage />}
        {activeTab === "saved" && <SavedPage />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </main>
  );
}
