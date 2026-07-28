// Phase 3 — Server-authoritative diamond wallet logic.
//
// All balance mutations go through here so the rules live in ONE place and the
// app can never grant itself diamonds or read a stale balance. Three operations:
//
//   getWallet  — read (creates a zero-balance row on first sight)
//   spend      — charge SUMMARY_COST to unlock ONE article's summary, once per
//                user. Re-opening an already-unlocked article is free.
//   earn       — credit engagement diamonds, clamped to the daily cap
//                (10 anon / 100 registered). Referral bonuses bypass the cap.
//
// Concurrency: spend inserts the unlock row FIRST (unique index = the lock) then
// charges, rolling back the unlock if the balance was insufficient. earn uses
// optimistic concurrency (guard on the counter values we read) with a few
// retries, so two simultaneous earns can't both slip past the cap.
import { connectDB } from "./db";
import {
  DiamondModel,
  DiamondUnlockModel,
  DAILY_CAP_ANON,
  DAILY_CAP_REGISTERED,
  SUMMARY_COST,
} from "@/models/DiamondModel";

export { SUMMARY_COST } from "@/models/DiamondModel";

export type EarnKind = "engagement" | "referral";

export interface WalletView {
  subjectId: string;
  balance: number;
  registered: boolean;
  earnedToday: number;   // engagement diamonds counted against today's cap
  dailyCap: number;      // the cap that applies to this subject right now
  remainingToday: number;// how many more engagement diamonds they can earn today
}

// Local YYYY-MM-DD. The server is the single clock so every subject's "day"
// rolls over consistently regardless of device timezone.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function capFor(registered: boolean): number {
  return registered ? DAILY_CAP_REGISTERED : DAILY_CAP_ANON;
}

function toView(doc: {
  subjectId: string; balance: number; registered: boolean;
  earnedToday: number; earnedDate: string;
}): WalletView {
  const cap = capFor(doc.registered);
  const earnedToday = doc.earnedDate === today() ? doc.earnedToday : 0;
  return {
    subjectId: doc.subjectId,
    balance: doc.balance,
    registered: doc.registered,
    earnedToday,
    dailyCap: cap,
    remainingToday: Math.max(0, cap - earnedToday),
  };
}

/**
 * Fetch (or lazily create) a subject's wallet. If `registered` is provided it is
 * persisted — this is how a subject's tier (and therefore daily cap) gets bumped
 * to 100 once they sign in. Returns null only if the DB is unreachable.
 */
export async function getWallet(
  subjectId: string,
  registered?: boolean
): Promise<WalletView | null> {
  if (!subjectId) return null;
  const conn = await connectDB();
  if (!conn) return null;

  const set: Record<string, unknown> = {};
  if (typeof registered === "boolean") set.registered = registered;

  const doc = await DiamondModel.findOneAndUpdate(
    { subjectId },
    {
      $setOnInsert: { subjectId, balance: 0, earnedToday: 0, earnedDate: "" },
      ...(Object.keys(set).length ? { $set: set } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<{
    subjectId: string; balance: number; registered: boolean;
    earnedToday: number; earnedDate: string;
  }>();

  return doc ? toView(doc) : null;
}

export interface SpendResult {
  ok: boolean;
  unlocked: boolean;      // is the article unlocked for this subject now?
  charged: boolean;       // did THIS call deduct diamonds?
  balance: number;        // balance after the call
  reason?: "insufficient" | "db_unavailable";
}

/**
 * Spend SUMMARY_COST to unlock one article's summary for a subject — idempotent
 * per (subject, article). Re-opens are free. Never double-charges, never lets
 * the balance go negative.
 */
export async function spendForArticle(
  subjectId: string,
  articleId: string
): Promise<SpendResult> {
  const conn = await connectDB();
  if (!conn) {
    return { ok: false, unlocked: false, charged: false, balance: 0, reason: "db_unavailable" };
  }

  // 1) Claim the unlock. The unique (subjectId, articleId) index is our lock:
  //    exactly one concurrent caller wins the insert.
  try {
    await DiamondUnlockModel.create({ subjectId, articleId });
  } catch (err: unknown) {
    // Duplicate key → already unlocked previously (or by a racing request).
    // Either way this article is free for them now; report current balance.
    if (isDuplicateKey(err)) {
      const w = await getWallet(subjectId);
      return { ok: true, unlocked: true, charged: false, balance: w?.balance ?? 0 };
    }
    throw err;
  }

  // 2) We hold a fresh unlock — charge it. Only succeeds if they can afford it.
  const charged = await DiamondModel.findOneAndUpdate(
    { subjectId, balance: { $gte: SUMMARY_COST } },
    { $inc: { balance: -SUMMARY_COST } },
    { new: true }
  ).lean<{ balance: number }>();

  if (!charged) {
    // Couldn't afford it → undo the unlock so they can retry after earning more.
    await DiamondUnlockModel.deleteOne({ subjectId, articleId });
    const w = await getWallet(subjectId);
    return { ok: false, unlocked: false, charged: false, balance: w?.balance ?? 0, reason: "insufficient" };
  }

  return { ok: true, unlocked: true, charged: true, balance: charged.balance };
}

/**
 * Undo a spend when the thing the user paid for could not be delivered.
 *
 * The app charges BEFORE generating the summary, so while the text provider was
 * down every tap on सारांश took 5💎 and returned an error — the user paid for
 * nothing, with no way to get it back. This releases the unlock and credits the
 * diamonds so a retry is possible.
 *
 * Idempotent: if the unlock is already gone (someone refunded, or it was never
 * charged) nothing is credited, so this cannot be replayed to mint diamonds.
 */
export async function refundArticle(
  subjectId: string,
  articleId: string
): Promise<{ ok: boolean; refunded: boolean; balance: number }> {
  const conn = await connectDB();
  if (!conn) return { ok: false, refunded: false, balance: 0 };

  // Deleting the unlock is the guard — only the caller that actually removes a
  // row is allowed to credit, so concurrent refunds cannot double-credit.
  const del = await DiamondUnlockModel.deleteOne({ subjectId, articleId });
  if (del.deletedCount !== 1) {
    const w = await getWallet(subjectId);
    return { ok: true, refunded: false, balance: w?.balance ?? 0 };
  }

  const credited = await DiamondModel.findOneAndUpdate(
    { subjectId },
    { $inc: { balance: SUMMARY_COST } },
    { new: true }
  ).lean<{ balance: number }>();

  return { ok: true, refunded: true, balance: credited?.balance ?? 0 };
}

export interface EarnResult {
  ok: boolean;
  granted: number;        // diamonds actually credited (may be < requested if capped)
  balance: number;
  remainingToday: number;
  cappedOut: boolean;     // true when the daily cap blocked some/all of the request
  reason?: "db_unavailable";
}

/**
 * Credit engagement diamonds, clamped so a subject can't exceed their daily cap.
 * `kind: "referral"` bypasses the cap (referral bonuses are on top of it).
 */
export async function earn(
  subjectId: string,
  amount: number,
  opts: { registered?: boolean; kind?: EarnKind } = {}
): Promise<EarnResult> {
  const conn = await connectDB();
  if (!conn) {
    return { ok: false, granted: 0, balance: 0, remainingToday: 0, cappedOut: false, reason: "db_unavailable" };
  }
  const amt = Math.max(0, Math.floor(amount));
  const kind: EarnKind = opts.kind ?? "engagement";

  // Make sure the row exists and reflects the latest registered tier.
  await getWallet(subjectId, opts.registered);

  // Referral bonus: straight credit, no cap, no counter bump.
  if (kind === "referral") {
    const doc = await DiamondModel.findOneAndUpdate(
      { subjectId },
      { $inc: { balance: amt } },
      { new: true }
    ).lean<{ balance: number; registered: boolean; earnedToday: number; earnedDate: string }>();
    const view = doc ? toView({ subjectId, ...doc }) : null;
    return {
      ok: true,
      granted: amt,
      balance: doc?.balance ?? 0,
      remainingToday: view?.remainingToday ?? 0,
      cappedOut: false,
    };
  }

  // Engagement: clamp to remaining daily allowance, with optimistic-concurrency
  // retries so two simultaneous earns can't both bypass the cap.
  const day = today();
  for (let attempt = 0; attempt < 4; attempt++) {
    const cur = await DiamondModel.findOne({ subjectId }).lean<{
      balance: number; registered: boolean; earnedToday: number; earnedDate: string;
    }>();
    if (!cur) continue;

    const cap = capFor(cur.registered);
    const earnedToday = cur.earnedDate === day ? cur.earnedToday : 0;
    const allowed = Math.max(0, cap - earnedToday);
    const grant = Math.min(amt, allowed);

    if (grant === 0) {
      return {
        ok: true, granted: 0, balance: cur.balance,
        remainingToday: 0, cappedOut: amt > 0,
      };
    }

    // Guard on the exact counter values we read — if a concurrent earn changed
    // them, the update matches nothing and we retry with fresh numbers.
    const updated = await DiamondModel.findOneAndUpdate(
      { subjectId, earnedToday: cur.earnedToday, earnedDate: cur.earnedDate },
      {
        $inc: { balance: grant },
        $set: { earnedToday: earnedToday + grant, earnedDate: day },
      },
      { new: true }
    ).lean<{ balance: number; registered: boolean; earnedToday: number; earnedDate: string }>();

    if (updated) {
      const remaining = Math.max(0, cap - (earnedToday + grant));
      return {
        ok: true,
        granted: grant,
        balance: updated.balance,
        remainingToday: remaining,
        cappedOut: grant < amt,
      };
    }
    // else: lost the race, loop and retry
  }

  // Exhausted retries (extreme contention) — report no grant rather than risk
  // exceeding the cap. The client keeps its server-truth balance regardless.
  const w = await getWallet(subjectId);
  return {
    ok: false, granted: 0, balance: w?.balance ?? 0,
    remainingToday: w?.remainingToday ?? 0, cappedOut: false,
  };
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}
