import mongoose, { Schema, Document, Model } from "mongoose";
import type { TopicId } from "@/types";

export interface IPushSubscription extends Document {
  userId: string;
  // The anonymous device id the mobile app already sends as X-Device-Id on
  // /api/feed and /api/signals. Without it the push path cannot join to
  // UserBehaviorModel, where the app's real per-topic affinity actually lives —
  // so notification targeting was blind to everything the ranker knows.
  deviceId?: string;
  endpoint: string;
  keys?: { p256dh: string; auth: string };
  kind: "web" | "expo" | "fcm";
  expoPushToken?: string;
  fcmToken?: string;
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
    deviceId: { type: String, index: true },
    endpoint: { type: String, required: true, unique: true, index: true },
    // Web push keys are optional — native (Expo) subscriptions don't have them.
    keys: {
      p256dh: { type: String },
      auth:   { type: String },
    },
    kind:          { type: String, enum: ["web", "expo", "fcm"], default: "web" },
    expoPushToken: { type: String },
    fcmToken:      { type: String },
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
