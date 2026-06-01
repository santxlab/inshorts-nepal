// Browser-side client for the server-authoritative diamond wallet.
//
// The balance lives on the server (see /api/diamonds*). The web app only
// reflects it. Subject key:
//   • signed-in, non-guest user → their userId  (daily cap 100)
//   • everyone else             → the anonymous device id "_did" (cap 10)
//
// This is the WEB twin of the Expo app's lib/diamonds.ts, hitting the same
// same-origin API routes.

export const SUMMARY_COST = 5;

export interface Wallet {
  subjectId: string;
  balance: number;
  registered: boolean;
  earnedToday: number;
  dailyCap: number;
  remainingToday: number;
}

const AUTH_KEY = "inshorts-nepal-auth";
const DID_KEY = "_did";

/** Resolve the wallet subject for this session and whether it's a registered tier. */
export function getDiamondSubject(): { subjectId: string; registered: boolean } {
  if (typeof window === "undefined") return { subjectId: "", registered: false };
  // Signed-in, non-guest user → keyed by userId (registered tier).
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { user?: { id?: string; isGuest?: boolean } };
      if (parsed?.user?.id && !parsed.user.isGuest) {
        return { subjectId: parsed.user.id, registered: true };
      }
    }
  } catch { /* fall through to device id */ }
  // Anonymous → reuse the same device id the rest of the app uses.
  let did = localStorage.getItem(DID_KEY);
  if (!did) {
    did = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DID_KEY, did);
  }
  return { subjectId: did, registered: false };
}

// Broadcast a new balance so any on-screen balance chip (e.g. the header)
// updates instantly without prop-drilling.
export function notifyBalance(balance: number) {
  if (typeof window !== "undefined" && typeof balance === "number") {
    window.dispatchEvent(new CustomEvent("inshorts:diamond", { detail: balance }));
  }
}

export async function getWallet(): Promise<Wallet | null> {
  const { subjectId, registered } = getDiamondSubject();
  if (!subjectId) return null;
  try {
    const params = new URLSearchParams({ subjectId, registered: registered ? "1" : "0" });
    const res = await fetch(`/api/diamonds?${params}`);
    if (!res.ok) return null;
    const w = (await res.json()) as Wallet;
    notifyBalance(w.balance);
    return w;
  } catch {
    return null;
  }
}

export interface SpendResult {
  ok: boolean;
  unlocked: boolean;
  charged: boolean;
  balance: number;
  reason?: "insufficient" | "db_unavailable" | "error";
}

export async function spendForSummary(articleId: string): Promise<SpendResult> {
  const { subjectId } = getDiamondSubject();
  try {
    const res = await fetch(`/api/diamonds/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, articleId }),
    });
    const data = (await res.json()) as SpendResult;
    if (typeof data.balance === "number") notifyBalance(data.balance);
    return data;
  } catch {
    return { ok: false, unlocked: false, charged: false, balance: 0, reason: "error" };
  }
}

export type EarnAction = "poll_answer" | "article_read" | "share" | "daily_open";

export interface EarnResult {
  ok: boolean;
  action: EarnAction;
  granted: number;
  balance: number;
  remainingToday: number;
  cappedOut: boolean;
}

export async function earnDiamonds(action: EarnAction): Promise<EarnResult | null> {
  const { subjectId, registered } = getDiamondSubject();
  try {
    const res = await fetch(`/api/diamonds/earn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, action, registered }),
    });
    if (!res.ok && res.status >= 500) return null;
    const data = (await res.json()) as EarnResult;
    if (typeof data.balance === "number") notifyBalance(data.balance);
    return data;
  } catch {
    return null;
  }
}
