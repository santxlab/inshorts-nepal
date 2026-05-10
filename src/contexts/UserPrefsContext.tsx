"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { UserPrefs, DEFAULT_PREFS, TopicId, Province, Language } from "@/types";

interface UserPrefsContextType {
  prefs: UserPrefs;
  setLanguage: (lang: Language) => void;
  setProvince: (p: Province | null) => void;
  setDistrict: (d: string | null) => void;
  setCity: (c: string | null) => void;
  toggleTopic: (id: TopicId) => void;
  setTopics: (ids: TopicId[]) => void;
  completeOnboarding: () => void;
  setNotifications: (enabled: boolean) => void;
  toggleSaved: (articleId: string) => void;
  isSaved: (articleId: string) => boolean;
  resetPrefs: () => void;
  loaded: boolean;
}

const UserPrefsContext = createContext<UserPrefsContextType | null>(null);
const STORAGE_KEY = "inshorts-nepal-prefs";

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(saved) });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setLanguage = (language: Language) => update({ language });
  const setProvince = (province: Province | null) => update({ province, district: null, city: null });
  const setDistrict = (district: string | null) => update({ district, city: null });
  const setCity = (city: string | null) => update({ city });

  const toggleTopic = (id: TopicId) =>
    update({ topics: prefs.topics.includes(id) ? prefs.topics.filter((t) => t !== id) : [...prefs.topics, id] });

  const setTopics = (topics: TopicId[]) => update({ topics });
  const completeOnboarding = () => update({ onboardingCompleted: true });
  const setNotifications = (notificationsEnabled: boolean) => update({ notificationsEnabled });

  const toggleSaved = (articleId: string) =>
    update({
      savedArticleIds: prefs.savedArticleIds.includes(articleId)
        ? prefs.savedArticleIds.filter((id) => id !== articleId)
        : [...prefs.savedArticleIds, articleId],
    });

  const isSaved = (articleId: string) => prefs.savedArticleIds.includes(articleId);
  const resetPrefs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPrefs(DEFAULT_PREFS);
  };

  return (
    <UserPrefsContext.Provider value={{
      prefs, setLanguage, setProvince, setDistrict, setCity,
      toggleTopic, setTopics, completeOnboarding, setNotifications,
      toggleSaved, isSaved, resetPrefs, loaded,
    }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export function useUserPrefs() {
  const ctx = useContext(UserPrefsContext);
  if (!ctx) throw new Error("useUserPrefs must be inside UserPrefsProvider");
  return ctx;
}
