"use client";
import { useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Category } from "@/types";

const CATEGORIES: { value: Category; labelEn: string; labelNe: string; emoji: string }[] = [
  { value: "all", labelEn: "All", labelNe: "सबै", emoji: "📰" },
  { value: "politics", labelEn: "Politics", labelNe: "राजनीति", emoji: "🏛️" },
  { value: "business", labelEn: "Business", labelNe: "व्यापार", emoji: "📈" },
  { value: "sports", labelEn: "Sports", labelNe: "खेल", emoji: "🏆" },
  { value: "technology", labelEn: "Tech", labelNe: "प्रविधि", emoji: "💻" },
  { value: "entertainment", labelEn: "Entertainment", labelNe: "मनोरञ्जन", emoji: "🎬" },
  { value: "health", labelEn: "Health", labelNe: "स्वास्थ्य", emoji: "🏥" },
  { value: "world", labelEn: "World", labelNe: "विश्व", emoji: "🌍" },
  { value: "education", labelEn: "Education", labelNe: "शिक्षा", emoji: "📚" },
];

export default function CategoryBar() {
  const { category, setCategory, language } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gray-950 border-b border-gray-800/50">
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "bg-nepal-red text-white shadow-lg shadow-red-900/40 scale-105"
                  : "bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white"
              } ${language === "ne" ? "font-ne" : ""}`}
            >
              <span className="text-sm">{cat.emoji}</span>
              <span>{language === "ne" ? cat.labelNe : cat.labelEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
