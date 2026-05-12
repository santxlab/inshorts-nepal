import mongoose, { Schema, Document, Model } from "mongoose";
import type { TopicId } from "@/types";

export interface IPushSubscription extends Document {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  topics: TopicId[];
  language: string;
  topicScores: Record<string, number>;
  dailySent: { date: string; count: number };
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId:   { type: String, required: true, default: "anon" },
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },
    topics:      { type: [String], default: [] },
    language:    { type: String, default: "ne" },
    topicScores: { type: Object, default: {} },
    dailySent: {
      date:  { type: String, default: "" },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Avoid OverwriteModelError during Next.js hot-reload
export const PushSubscriptionModel: Model<IPushSubscription> =
  mongoose.models.PushSubscription ??
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
