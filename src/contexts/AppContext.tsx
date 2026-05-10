"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Language, Category } from "@/types";

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  category: Category;
  setCategory: (cat: Category) => void;
  isDark: boolean;
  toggleDark: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>("en");
  const [category, setCategory] = useState<Category>("all");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Auto-detect browser language
    const saved = localStorage.getItem("preferred-language") as Language | null;
    if (saved) {
      setLang(saved);
    } else {
      const browserLang = navigator.language || "en";
      const detected: Language = browserLang.startsWith("ne") ? "ne" : "en";
      setLang(detected);
    }

    // Load dark mode preference
    const darkPref = localStorage.getItem("dark-mode");
    if (darkPref !== null) {
      setIsDark(darkPref === "true");
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dark-mode", String(isDark));
  }, [isDark]);

  const setLanguage = (lang: Language) => {
    setLang(lang);
    localStorage.setItem("preferred-language", lang);
  };

  const toggleDark = () => setIsDark((d) => !d);

  return (
    <AppContext.Provider
      value={{ language, setLanguage, category, setCategory, isDark, toggleDark }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
