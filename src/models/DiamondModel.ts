// Phase 3 — Server-authoritative diamond wallet.
//
// Diamonds used to live only in the app's AsyncStorage, which means a user
// could reset them by clearing data and there was no way to ENFORCE spending or
// a daily earning cap. Now the server owns the balance; the app just displays
// it. Keyed by `subjectId`:
//   • anonymous users → their deviceId
//   • registered users → their userId (a deviceId row can be migrated/merged
//     into a userId row at sign-in time — handled later in the auth phase)
//
// Daily earning cap (engagement diamonds only, NOT referral bonuses):
//   • anonymous  → 10 / day
//   • registered → 100 / day
import mongoose, { Schema, Document, Model } from "mongoose";

// A guest hit the old cap of 10 in roughly three minutes — daily_open (2) +
// poll (5) + three article reads (3) — and a single summary costs 5, so guests
// got exactly two summaries a day. The wall arrived before they had engaged
// enough to want an account, so it read as "this feature is broken" rather than
export const DAILY_CAP_ANON = 20;
export const DAILY_CAP_REGISTERED = 100;
export const SUMMARY_COST = 5;

// Polls pay 5 — the single most valuable action, 5x an article read — so they
// are the fastest way to burn the daily cap. Guests are limited to 3 polls a
// day (15 diamonds) so the poll reward cannot consume their entire 20-diamond
// allowance before they have read anything. Registered users are unrestricted:
// all 7 daily polls (35) sit comfortably inside their 100 cap.
export const DAILY_POLLS_ANON = 3;

export interface IDiamond extends Document {
  subjectId: string;
  balance: number;
  registered: boolean;
  earnedToday: number;     // engagement diamonds counted against the daily cap
  earnedDate: string;      // YYYY-MM-DD the earnedToday counter belongs to
  pollsToday: number;      // poll_answer earns today (guests are limited)
  createdAt: Date;
  updatedAt: Date;
}

const DiamondSchema = new Schema<IDiamond>(
  {
    subjectId:  { type: String, required: true, unique: true, index: true },
    balance:    { type: Number, required: true, default: 0, min: 0 },
    registered: { type: Boolean, required: true, default: false },
    earnedToday:{ type: Number, required: true, default: 0 },
    earnedDate: { type: String, required: true, default: "" },
    pollsToday: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const DiamondModel: Model<IDiamond> =
  mongoose.models.Diamond ?? mongoose.model<IDiamond>("Diamond", DiamondSchema);

// Records that a subject has already paid to unlock an article's summary, so a
// re-open is free (per-article, once-per-user charge model).
export interface IDiamondUnlock extends Document {
  subjectId: string;
  articleId: string;
  createdAt: Date;
}

const DiamondUnlockSchema = new Schema<IDiamondUnlock>(
  {
    subjectId: { type: String, required: true },
    articleId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DiamondUnlockSchema.index({ subjectId: 1, articleId: 1 }, { unique: true });

export const DiamondUnlockModel: Model<IDiamondUnlock> =
  mongoose.models.DiamondUnlock ?? mongoose.model<IDiamondUnlock>("DiamondUnlock", DiamondUnlockSchema);
