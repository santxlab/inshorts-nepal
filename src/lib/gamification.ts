// Gamification: streaks, diamonds, badges, ranks

export interface UserStreak {
  current: number;       // consecutive days read
  longest: number;       // all-time best
  lastReadDate: string;  // ISO date string (YYYY-MM-DD)
  totalDays: number;     // total reading days ever
}

export interface Badge {
  id: string;
  label: string;
  labelNe: string;
  emoji: string;
  description: string;
  unlockedAt?: string; // ISO timestamp
}

export interface UserGamification {
  streak: UserStreak;
  diamonds: number;
  badges: string[]; // badge ids
  rank: string;
  xp: number;       // experience points → rank progression
  pollsAnswered: number;
  articlesRead: number;
  sharesCount: number;
}

export const DEFAULT_GAMIFICATION: UserGamification = {
  streak: { current: 0, longest: 0, lastReadDate: "", totalDays: 0 },
  diamonds: 0,
  badges: [],
  rank: "नयाँ पाठक", // "New Reader"
  xp: 0,
  pollsAnswered: 0,
  articlesRead: 0,
  sharesCount: 0,
};

export const ALL_BADGES: Badge[] = [
  { id: "first_read",    label: "First Read",       labelNe: "पहिलो पठन",       emoji: "📖", description: "Read your first article" },
  { id: "streak_3",      label: "3-Day Streak",     labelNe: "३ दिन लगातार",    emoji: "🔥", description: "Read 3 days in a row" },
  { id: "streak_7",      label: "Week Warrior",     labelNe: "साताको योद्धा",   emoji: "⚡", description: "Read 7 days in a row" },
  { id: "streak_30",     label: "Monthly Master",   labelNe: "महिनाको मास्टर",  emoji: "🏆", description: "Read 30 days in a row" },
  { id: "streak_100",    label: "Century Reader",   labelNe: "शताब्दी पाठक",    emoji: "💯", description: "Read 100 days in a row" },
  { id: "sharer",        label: "News Spreader",    labelNe: "समाचार प्रचारक",  emoji: "📢", description: "Share 10 articles" },
  { id: "super_sharer",  label: "Super Sharer",     labelNe: "सुपर शेयरर",      emoji: "🚀", description: "Share 50 articles" },
  { id: "poll_voter",    label: "Poll Voter",       labelNe: "मतदाता",           emoji: "🗳️", description: "Answer your first poll" },
  { id: "poll_master",   label: "Poll Master",      labelNe: "मत मास्टर",        emoji: "📊", description: "Answer 20 polls" },
  { id: "night_owl",     label: "Night Owl",        labelNe: "रातको उल्लू",     emoji: "🦉", description: "Read between midnight and 4 AM" },
  { id: "early_bird",    label: "Early Bird",       labelNe: "बिहानको चरा",     emoji: "🐦", description: "Read the morning digest" },
  { id: "collector",     label: "Collector",        labelNe: "संग्रहकर्ता",      emoji: "🗂️", description: "Save 20 articles" },
  { id: "audio_fan",     label: "Audio Fan",        labelNe: "अडियो प्रेमी",     emoji: "🎧", description: "Listen to 10 audio briefs" },
  { id: "top_reader",    label: "Top Reader",       labelNe: "टप पाठक",          emoji: "⭐", description: "Read 100 articles total" },
  { id: "nepal_lover",   label: "Nepal Lover",      labelNe: "नेपाल प्रेमी",     emoji: "🇳🇵", description: "Use the app for 30 days" },
];

export const RANKS = [
  { min: 0,    label: "नयाँ पाठक",       emoji: "🌱", diamonds_bonus: 1 },
  { min: 100,  label: "नियमित पाठक",     emoji: "📰", diamonds_bonus: 2 },
  { min: 300,  label: "जिज्ञासु पाठक",   emoji: "🔍", diamonds_bonus: 3 },
  { min: 600,  label: "समाचार प्रेमी",   emoji: "❤️", diamonds_bonus: 4 },
  { min: 1000, label: "समाचार विज्ञ",    emoji: "🎓", diamonds_bonus: 5 },
  { min: 2000, label: "समाचार मास्टर",   emoji: "🏅", diamonds_bonus: 7 },
  { min: 5000, label: "समाचार गुरु",     emoji: "🏆", diamonds_bonus: 10 },
];

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function updateStreak(g: UserGamification): UserGamification {
  const today = todayString();
  const streak = { ...g.streak };

  if (streak.lastReadDate === today) return g; // already counted today

  if (streak.lastReadDate === yesterdayString()) {
    streak.current += 1;
  } else {
    streak.current = 1; // reset
  }

  streak.longest = Math.max(streak.longest, streak.current);
  streak.lastReadDate = today;
  streak.totalDays += 1;

  return { ...g, streak };
}

export function getRank(xp: number): typeof RANKS[0] {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.min) rank = r;
  }
  return rank;
}

export function awardDiamonds(g: UserGamification, amount: number, reason?: string): UserGamification {
  console.log(`💎 +${amount} diamonds: ${reason ?? "unknown"}`);
  return { ...g, diamonds: g.diamonds + amount };
}

export function awardXP(g: UserGamification, amount: number): UserGamification {
  const newXp = g.xp + amount;
  const newRank = getRank(newXp).label;
  return { ...g, xp: newXp, rank: newRank };
}

export function checkAndUnlockBadges(g: UserGamification): { g: UserGamification; newBadges: Badge[] } {
  const newBadges: Badge[] = [];
  const earned = new Set(g.badges);

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) {
      const badge = ALL_BADGES.find((b) => b.id === id);
      if (badge) {
        earned.add(id);
        newBadges.push({ ...badge, unlockedAt: new Date().toISOString() });
      }
    }
  };

  check("first_read",   g.articlesRead >= 1);
  check("streak_3",     g.streak.current >= 3);
  check("streak_7",     g.streak.current >= 7);
  check("streak_30",    g.streak.current >= 30);
  check("streak_100",   g.streak.current >= 100);
  check("sharer",       g.sharesCount >= 10);
  check("super_sharer", g.sharesCount >= 50);
  check("poll_voter",   g.pollsAnswered >= 1);
  check("poll_master",  g.pollsAnswered >= 20);
  check("top_reader",   g.articlesRead >= 100);
  check("collector",    false); // checked externally via savedCount

  return { g: { ...g, badges: [...earned] }, newBadges };
}

export function recordArticleRead(g: UserGamification): UserGamification {
  let updated = { ...g, articlesRead: g.articlesRead + 1 };
  updated = updateStreak(updated);
  updated = awardXP(updated, 10);
  const rankBonus = getRank(updated.xp).diamonds_bonus;
  updated = awardDiamonds(updated, rankBonus, "article read");
  return updated;
}

export function recordShare(g: UserGamification): UserGamification {
  let updated = { ...g, sharesCount: g.sharesCount + 1 };
  updated = awardDiamonds(updated, 3, "share");
  updated = awardXP(updated, 5);
  return updated;
}

export function recordPollAnswer(g: UserGamification): UserGamification {
  let updated = { ...g, pollsAnswered: g.pollsAnswered + 1 };
  updated = awardDiamonds(updated, 5, "poll answer");
  updated = awardXP(updated, 15);
  return updated;
}

const GAMIFICATION_KEY = "inshorts-nepal-gamification";

export function loadGamification(): UserGamification {
  if (typeof window === "undefined") return DEFAULT_GAMIFICATION;
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    if (raw) return { ...DEFAULT_GAMIFICATION, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_GAMIFICATION;
}

export function saveGamification(g: UserGamification): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(g));
  } catch { /* ignore */ }
}
