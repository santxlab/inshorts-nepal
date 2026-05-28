// Phase 2.2 — Cached short-form AI summaries.
// Keyed by (articleId, lang, mode) so each article gets ONE summary per
// language per length — produced ONCE, served to every user. First user "pays"
// the model token cost; everyone else reads it free from this cache.
//   mode "short" → 30–40 words (shown from the in-app news card pill)
//   mode "long"  → 60–70 words (shown when reading the full story)
import mongoose, { Schema, Document, Model } from "mongoose";

export type SummaryMode = "short" | "long";

export interface ISummary extends Document {
  articleId: string;
  lang: "ne" | "en";
  mode: SummaryMode;
  summary: string;
  modelName: string;       // e.g. "deepseek-v3.2"
  createdAt: Date;
  updatedAt: Date;
}

const SummarySchema = new Schema<ISummary>(
  {
    articleId: { type: String, required: true, index: true },
    lang:      { type: String, enum: ["ne", "en"], required: true },
    mode:      { type: String, enum: ["short", "long"], required: true, default: "long" },
    summary:   { type: String, required: true },
    modelName: { type: String, required: true },
  },
  { timestamps: true }
);

// One summary per (article, language, length).
SummarySchema.index({ articleId: 1, lang: 1, mode: 1 }, { unique: true });

export const SummaryModel: Model<ISummary> =
  mongoose.models.Summary ?? mongoose.model<ISummary>("Summary", SummarySchema);
