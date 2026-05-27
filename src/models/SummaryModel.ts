// Phase 2.2 — Cached short-form AI summaries (Inshorts-style 55–65 words).
// Keyed by (articleId, lang) so each article gets a single summary in each
// language — produced ONCE, served to every user. First user "pays" the
// model token cost; everyone else reads it free from this cache.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISummary extends Document {
  articleId: string;
  lang: "ne" | "en";
  summary: string;
  modelName: string;       // e.g. "deepseek-v3.2"
  createdAt: Date;
  updatedAt: Date;
}

const SummarySchema = new Schema<ISummary>(
  {
    articleId: { type: String, required: true, index: true },
    lang:      { type: String, enum: ["ne", "en"], required: true },
    summary:   { type: String, required: true },
    modelName: { type: String, required: true },
  },
  { timestamps: true }
);

// One summary per (article, language)
SummarySchema.index({ articleId: 1, lang: 1 }, { unique: true });

export const SummaryModel: Model<ISummary> =
  mongoose.models.Summary ?? mongoose.model<ISummary>("Summary", SummarySchema);
