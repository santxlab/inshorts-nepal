"use client";
import { TopicId } from "@/types";
import { TOPICS } from "@/lib/topics-config";

interface Props {
  selected: TopicId[];
  onTopics: (ids: TopicId[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TopicsStep({ selected, onTopics, onNext, onBack }: Props) {
  const toggle = (id: TopicId) => {
    onTopics(
      selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]
    );
  };

  const allSelected = selected.length === TOPICS.length;
  const toggleAll = () => onTopics(allSelected ? [] : TOPICS.map((t) => t.id));

  return (
    <div className="flex flex-col h-full px-6">
      <div className="text-center mb-4">
        <div className="text-5xl mb-3">🎯</div>
        <h2 className="text-2xl font-bold text-white mb-1">Your Interests</h2>
        <p className="text-white/70 text-sm">Pick topics you care about</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
            {selected.length} selected
          </span>
          <button onClick={toggleAll} className="text-white/60 text-xs underline">
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
        <div className="grid grid-cols-2 gap-2">
          {TOPICS.map((topic) => {
            const isSelected = selected.includes(topic.id);
            return (
              <button
                key={topic.id}
                onClick={() => toggle(topic.id)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-white bg-white/25 shadow-sm"
                    : "border-white/20 bg-white/8 hover:bg-white/12"
                }`}
              >
                <span className="text-xl flex-shrink-0">{topic.emoji}</span>
                <div className="min-w-0">
                  <div className="text-white text-xs font-semibold truncate">{topic.label}</div>
                  <div className="text-white/50 text-[10px] truncate">{topic.labelNe}</div>
                </div>
                {isSelected && (
                  <div className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                    <span className="text-[#DC143C] text-[10px]">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="py-4 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 rounded-2xl border-2 border-white/40 text-white font-semibold"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 py-4 rounded-2xl bg-white text-[#DC143C] font-bold text-lg shadow-lg disabled:opacity-50"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
