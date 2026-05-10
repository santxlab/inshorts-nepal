"use client";
import { useState } from "react";
import { Globe, Moon, Sun, Search, X, Newspaper } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Language } from "@/types";

interface HeaderProps {
  onSearch?: (q: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const { language, setLanguage, isDark, toggleDark } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
    setShowSearch(false);
  };

  const langs: { value: Language; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "ne", label: "नेपाली", flag: "🇳🇵" },
  ];

  return (
    <header className="relative z-50 bg-gray-950 dark:bg-gray-950 border-b border-gray-800/50">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg nepal-gradient flex items-center justify-center shadow-lg shadow-red-900/30">
              <Newspaper className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full pulse-ring border border-gray-950" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">
              <span className="gradient-text">Nepal</span>
              <span className="text-white"> Short</span>
            </h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-none mt-0.5">
              {language === "ne" ? "छोटो समाचार" : "Quick News"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          {showSearch ? (
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-2 absolute left-0 right-0 top-0 h-14 px-4 bg-gray-950 z-10"
            >
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "ne" ? "खोज्नुहोस्..." : "Search news..."}
                className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none border border-gray-700 focus:border-red-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Search className="w-4 h-4 text-gray-400" />
            </button>
          )}

          {/* Language picker */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700/50"
            >
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-300">
                {language === "en" ? "EN" : "नेपा"}
              </span>
            </button>

            {showLangPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLangPicker(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-20 min-w-[140px]">
                  {langs.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => {
                        setLanguage(l.value);
                        setShowLangPicker(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        language === l.value
                          ? "bg-red-600/20 text-red-400"
                          : "hover:bg-gray-800 text-gray-300"
                      }`}
                    >
                      <span className="text-lg">{l.flag}</span>
                      <span className="font-medium">{l.label}</span>
                      {language === l.value && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dark mode */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-yellow-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
