"use client";
import { useState, useEffect } from "react";
import { useUserPrefs } from "@/contexts/UserPrefsContext";
import { useGamification } from "@/contexts/GamificationContext";
import {
  DailyPoll, getTodaysPoll, getPollWithUserVotes,
  loadPollAnswers, savePollAnswer,
} from "@/lib/polls";

export default function PollCard() {
  const { prefs } = useUserPrefs();
  const { onPollAnswer, gami } = useGamification();
  const [poll, setPoll] = useState<DailyPoll | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);

  const isNepali = prefs.language !== "en";

  useEffect(() => {
    const raw = getTodaysPoll();
    const withVotes = getPollWithUserVotes(raw);
    setPoll(withVotes);

    const answers = loadPollAnswers();
    if (answers[raw.id]) {
      setAnswered(answers[raw.id]);
      setShowResult(true);
    }
  }, []);

  if (!poll) return null;

  const handleVote = (optionId: string) => {
    if (answered) return;
    savePollAnswer(poll.id, optionId);
    setAnswered(optionId);
    setJustAnswered(true);
    setShowResult(true);
    onPollAnswer();

    // Update poll with new vote
    const updatedOptions = poll.options.map((o) =>
      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
    );
    const newTotal = updatedOptions.reduce((s, o) => s + o.votes, 0);
    setPoll({ ...poll, options: updatedOptions, totalVotes: newTotal });

    setTimeout(() => setJustAnswered(false), 2000);
  };

  const topOption = [...poll.options].sort((a, b) => b.votes - a.votes)[0];

  return (
    <div className="news-snap-item relative w-full overflow-hidden bg-gradient-to-br from-[#1a0030] via-[#0a001a] to-[#001030] flex flex-col justify-center px-5">
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 text-[200px] pointer-events-none">🗳️</div>

      <div className="relative z-10 max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-purple-600/80 text-white text-xs font-bold uppercase tracking-wider">
            📊 {isNepali ? "आजको प्रश्न" : "Today's Poll"}
          </span>
          <span className="text-white/40 text-xs">+{poll.diamondReward} 💎</span>
        </div>

        {/* Question */}
        <h2 className="text-white text-2xl font-black leading-snug mb-6">
          {isNepali ? poll.questionNe : poll.question}
        </h2>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {poll.options.map((opt) => {
            const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
            const isChosen = answered === opt.id;
            const isWinner = showResult && opt.id === topOption.id;

            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id)}
                disabled={!!answered}
                className={`w-full text-left relative overflow-hidden rounded-xl border-2 transition-all ${
                  isChosen
                    ? "border-purple-400 bg-purple-900/40"
                    : isWinner && showResult
                    ? "border-white/40 bg-white/10"
                    : "border-white/15 bg-white/5 hover:bg-white/10 active:scale-[0.98]"
                }`}
              >
                {/* Result bar */}
                {showResult && (
                  <div
                    className="absolute inset-y-0 left-0 bg-white/8 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between px-4 py-3.5">
                  <span className={`text-sm font-semibold ${isChosen ? "text-purple-200" : "text-white"}`}>
                    {isNepali ? opt.textNe : opt.text}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {showResult && (
                      <span className={`text-xs font-bold ${isChosen ? "text-purple-300" : "text-white/50"}`}>
                        {pct}%
                      </span>
                    )}
                    {isChosen && <span className="text-purple-300 text-sm">✓</span>}
                    {isWinner && !isChosen && showResult && <span className="text-xs">🏆</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* After vote */}
        {showResult && (
          <div className="text-center space-y-2">
            <p className="text-white/50 text-xs">
              {poll.totalVotes.toLocaleString()} {isNepali ? "जनाले मतदान गरे" : "people voted"}
            </p>
            {justAnswered && (
              <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm font-bold">
                <span>💎 +{poll.diamondReward}</span>
                <span>{isNepali ? "हीरा कमाउनुभयो!" : "diamonds earned!"}</span>
              </div>
            )}
            <p className="text-white/30 text-xs">
              {isNepali ? "अर्को प्रश्न भोलि आउनेछ" : "Next poll tomorrow"}
            </p>
          </div>
        )}

        {!answered && (
          <p className="text-center text-white/30 text-xs">
            {isNepali ? "एउटा विकल्प छान्नुहोस्" : "Choose an option to vote"}
          </p>
        )}
      </div>
    </div>
  );
}
