// Phase 2.2 — Cached AI translations of news articles.
// Keyed by (articleId, targetLang) so each article is translated at most once
// per target language. Source-language articles store nothing (no translation
// needed); only foreign-source items live here.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITranslation extends Document {
  articleId: string;
  sourceLang: "ne" | "en";
  targetLang: "ne" | "en";
  title: string;
  summary: string;
  modelName: string;   // e.g. "gpt-4o-mini"
  createdAt: Date;
  updatedAt: Date;
}

const TranslationSchema = new Schema<ITranslation>(
  {
    articleId:  { type: String, required: true, index: true },
    sourceLang: { type: String, enum: ["ne", "en"], required: true },
    targetLang: { type: String, enum: ["ne", "en"], required: true },
    title:      { type: String, required: true },
    summary:    { type: String, required: true },
    modelName:  { type: String, required: true },
  },
  { timestamps: true }
);

// One translation per (article, target language)
TranslationSchema.index({ articleId: 1, targetLang: 1 }, { unique: true });

export const TranslationModel: Model<ITranslation> =
  mongoose.models.Translation ??
  mongoose.model<ITranslation>("Translation", TranslationSchema);
