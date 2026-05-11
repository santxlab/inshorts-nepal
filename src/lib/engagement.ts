// Engagement tracking for deferred auth prompts and smart nudges.
// All data stored in localStorage — no server needed.

export interface EngagementState {
  sessions: number;           // total app opens
  totalSwipes: number;        // cards swiped
  totalBookmarks: number;     // articles saved
  totalShares: number;        // articles shared
  promptsShown: string[];     // prompt ids already shown
  lastOpenedAt: string;       // ISO
  installedAt: string;        // ISO
}

const KEY = "_eng";

const DEFAULT: EngagementState = {
  sessions: 0,
  totalSwipes: 0,
  totalBookmarks: 0,
  totalShares: 0,
  promptsShown: [],
  lastOpenedAt: new Date().toISOString(),
  installedAt: new Date().toISOString(),
};

export function loadEngagement(): EngagementState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveEngagement(state: EngagementState): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function recordSession(): EngagementState {
  const state = loadEngagement();
  const next = {
    ...state,
    sessions: state.sessions + 1,
    lastOpenedAt: new Date().toISOString(),
    installedAt: state.installedAt || new Date().toISOString(),
  };
  saveEngagement(next);
  return next;
}

export function recordSwipe(): EngagementState {
  const state = loadEngagement();
  const next = { ...state, totalSwipes: state.totalSwipes + 1 };
  saveEngagement(next);
  return next;
}

export function recordBookmark(): EngagementState {
  const state = loadEngagement();
  const next = { ...state, totalBookmarks: state.totalBookmarks + 1 };
  saveEngagement(next);
  return next;
}

export function recordShare(): EngagementState {
  const state = loadEngagement();
  const next = { ...state, totalShares: state.totalShares + 1 };
  saveEngagement(next);
  return next;
}

export function markPromptShown(promptId: string): void {
  const state = loadEngagement();
  if (!state.promptsShown.includes(promptId)) {
    saveEngagement({ ...state, promptsShown: [...state.promptsShown, promptId] });
  }
}

export type PromptId =
  | "save_prefs"        // after 10 swipes
  | "create_account"    // after 2nd session
  | "sync_bookmarks"    // after 3 bookmarks
  | "share_app"         // after 1st share
  | "smart_recs"        // after 20 swipes
  | "streak_start";     // after 3rd session

export function getNextPrompt(state: EngagementState): PromptId | null {
  const shown = new Set(state.promptsShown);

  if (state.totalSwipes >= 10 && !shown.has("save_prefs")) return "save_prefs";
  if (state.sessions >= 2 && !shown.has("create_account")) return "create_account";
  if (state.totalBookmarks >= 3 && !shown.has("sync_bookmarks")) return "sync_bookmarks";
  if (state.totalShares >= 1 && !shown.has("share_app")) return "share_app";
  if (state.totalSwipes >= 20 && !shown.has("smart_recs")) return "smart_recs";
  if (state.sessions >= 3 && !shown.has("streak_start")) return "streak_start";
  return null;
}
