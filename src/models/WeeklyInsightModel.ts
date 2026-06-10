// Weekly AI Insight — one generated "story" per ISO week, per language.
// Generated ONCE (first request triggers it), cached in MongoDB, then served to
// every user from cache. A user sees it once (tracked client-side). Pages are a
// 3–4 slide swipeable story summarizing the week's biggest category.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInsightPage {
  heading: string;
  body: string;
  imageUrl?: string;
}

export interface IWeeklyInsight extends Document {
  weekId: string;              // e.g. "2026-W24"
  lang: "ne" | "en";
  category: string;            // topic id
  categoryLabel: string;       // human label in `lang`
  title: string;               // overall insight title
  shareMessage: string;        // AI-written engaging share caption
  pages: IInsightPage[];
  articleIds: string[];        // source articles
  createdAt: Date;
  updatedAt: Date;
}

const InsightPageSchema = new Schema<IInsightPage>(
  {
    heading:  { type: String, required: true },
    body:     { type: String, required: true },
    imageUrl: { type: String },
  },
  { _id: false }
);

const WeeklyInsightSchema = new Schema<IWeeklyInsight>(
  {
    weekId:        { type: String, required: true, index: true },
    lang:          { type: String, enum: ["ne", "en"], required: true },
    category:      { type: String, required: true },
    categoryLabel: { type: String, required: true },
    title:         { type: String, required: true },
    shareMessage:  { type: String, required: true },
    pages:         { type: [InsightPageSchema], default: [] },
    articleIds:    { type: [String], default: [] },
  },
  { timestamps: true }
);

// One insight per (week, language).
WeeklyInsightSchema.index({ weekId: 1, lang: 1 }, { unique: true });

export const WeeklyInsightModel: Model<IWeeklyInsight> =
  mongoose.models.WeeklyInsight ??
  mongoose.model<IWeeklyInsight>("WeeklyInsight", WeeklyInsightSchema);
