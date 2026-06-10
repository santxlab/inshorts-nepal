// Tracks insight-sharing virality: per (weekId, sharing user) we count how many
// times they shared the weekly insight, how many people opened their shared link
// (landing-page clicks), and how many proceeded to install. Lets us answer
// "how many users came in through insight shares, and via which user".
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInsightShare extends Document {
  weekId: string;
  userId: string;
  userName: string;
  shares: number;   // times this user tapped "share"
  clicks: number;   // landing-page opens of their shared link
  installs: number; // install-button taps from their shared link (Play Store handoff)
  createdAt: Date;
  updatedAt: Date;
}

const InsightShareSchema = new Schema<IInsightShare>(
  {
    weekId:   { type: String, required: true, index: true },
    userId:   { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    shares:   { type: Number, default: 0 },
    clicks:   { type: Number, default: 0 },
    installs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

InsightShareSchema.index({ weekId: 1, userId: 1 }, { unique: true });

export const InsightShareModel: Model<IInsightShare> =
  mongoose.models.InsightShare ??
  mongoose.model<IInsightShare>("InsightShare", InsightShareSchema);
