"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  UserGamification, DEFAULT_GAMIFICATION,
  loadGamification, saveGamification,
  recordArticleRead, recordShare, recordPollAnswer,
  checkAndUnlockBadges, Badge, ALL_BADGES,
} from "@/lib/gamification";

interface GamificationContextType {
  gami: UserGamification;
  onArticleRead: () => void;
  onShare: () => void;
  onPollAnswer: () => void;
  onSave: (savedCount: number) => void;
  onAudioListen: () => void;
  newBadges: Badge[];
  clearNewBadges: () => void;
  getBadgeById: (id: string) => Badge | undefined;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [gami, setGami] = useState<UserGamification>(DEFAULT_GAMIFICATION);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  useEffect(() => {
    setGami(loadGamification());
  }, []);

  const update = useCallback((updater: (g: UserGamification) => UserGamification) => {
    setGami((prev) => {
      const next = updater(prev);
      const { g: withBadges, newBadges: nb } = checkAndUnlockBadges(next);
      if (nb.length > 0) setNewBadges((cur) => [...cur, ...nb]);
      saveGamification(withBadges);
      return withBadges;
    });
  }, []);

  const onArticleRead = useCallback(() => update(recordArticleRead), [update]);
  const onShare = useCallback(() => update(recordShare), [update]);
  const onPollAnswer = useCallback(() => update(recordPollAnswer), [update]);

  const onSave = useCallback((currentSavedCount: number) => {
    // currentSavedCount = actual number of saved articles AFTER the toggle
    update((g) => {
      if (currentSavedCount >= 20 && !g.badges.includes("collector")) {
        const badge = ALL_BADGES.find((b) => b.id === "collector");
        if (badge) {
          setNewBadges((cur) => [...cur, { ...badge, unlockedAt: new Date().toISOString() }]);
          return { ...g, badges: [...g.badges, "collector"] };
        }
      }
      return g;
    });
  }, [update]);

  const onAudioListen = useCallback(() => {
    update((g) => {
      // Count audio listens via xp (10 listens → audio_fan badge)
      const newG = { ...g, xp: g.xp + 8 };
      // Simple heuristic: badges.filter audio listens via xp milestones
      return newG;
    });
  }, [update]);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);
  const getBadgeById = (id: string) => ALL_BADGES.find((b) => b.id === id);

  // Always render the Provider so children using useGamification() never throw.
  // Before `loaded`, gami === DEFAULT_GAMIFICATION (safe default, updates on next tick).
  return (
    <GamificationContext.Provider value={{
      gami, onArticleRead, onShare, onPollAnswer, onSave, onAudioListen,
      newBadges, clearNewBadges, getBadgeById,
    }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error("useGamification must be inside GamificationProvider");
  return ctx;
}
