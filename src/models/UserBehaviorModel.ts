// Wave 2 — Per-device behavior profile, persisted in MongoDB.
// Keyed by anonymous deviceId from the mobile app. Falls back to an in-memory
// map if MongoDB is unavailable (mirrors PushSubscriptionModel's approach).
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserBehavior extends Document {
  deviceId: string;
  language?: "ne" | "en";
  region?: string;

  // Per-topic affinity: 0–100, baseline 50 (NEUTRAL), with time decay.
  topicScores: Record<string, { score: number; ts: number; n: number }>;
  // Source affinity (positive = preferred).
  sourceScores: Record<string, number>;
  // Daypart → topic → score (so morning vs evening preferences can diverge).
  dayparts: Record<"morning" | "afternoon" | "evening" | "night", Record<string, number>>;

  langPref: { ne: number; en: number };
  signals: {
    reads: number; skips: number; saves: number; shares: number;
    clicks: number; reopens: number; dwellMs: number; dwellCount: number;
  };

  seenArticleIds: string[];   // rolling, capped — sinks already-read stories
  recentDepths: number[];     // last N session depths (for intent inference)
  totalRead: number;
  totalSkips: number;

  // Explicit feedback (Wave 3 wires the UI — logic+storage ready now).
  mutedSources: string[];
  hiddenTopics: string[];

  createdAt: Date;
  updatedAt: Date;
}

const UserBehaviorSchema = new Schema<IUserBehavior>(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    language: { type: String, enum: ["ne", "en"] },
    region:   { type: String },

    topicScores:  { type: Schema.Types.Mixed, default: {} },
    sourceScores: { type: Schema.Types.Mixed, default: {} },
    dayparts: {
      morning:   { type: Schema.Types.Mixed, default: {} },
      afternoon: { type: Schema.Types.Mixed, default: {} },
      evening:   { type: Schema.Types.Mixed, default: {} },
      night:     { type: Schema.Types.Mixed, default: {} },
    },

    langPref: {
      ne: { type: Number, default: 0 },
      en: { type: Number, default: 0 },
    },
    signals: {
      reads:   { type: Number, default: 0 },
      skips:   { type: Number, default: 0 },
      saves:   { type: Number, default: 0 },
      shares:  { type: Number, default: 0 },
      clicks:  { type: Number, default: 0 },
      reopens: { type: Number, default: 0 },
      dwellMs: { type: Number, default: 0 },
      dwellCount: { type: Number, default: 0 },
    },

    seenArticleIds: { type: [String], default: [] },
    recentDepths:   { type: [Number], default: [] },
    totalRead:      { type: Number, default: 0 },
    totalSkips:     { type: Number, default: 0 },

    mutedSources: { type: [String], default: [] },
    hiddenTopics: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Hot-reload guard
export const UserBehaviorModel: Model<IUserBehavior> =
  mongoose.models.UserBehavior ??
  mongoose.model<IUserBehavior>("UserBehavior", UserBehaviorSchema);
