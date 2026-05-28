// Persistent article storage in MongoDB. Mirrors the in-memory store so
// /news/<id> pages survive server restarts and the 500-cap eviction.
// New fetches upsert here (idempotent via the unique articleId index).
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IArticle extends Document {
  articleId: string;             // unique — matches NewsArticle.id
  title: string;
  summary: string;
  fullContent?: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  topics?: string[];
  language: "ne" | "en";
  origin?: "np" | "in" | "global";
  sourceQuality?: number;
  publishedAt: Date;
  fetchedAt: Date;
  isApproved: boolean;
  isBreaking?: boolean;
  readTimeSeconds?: number;
  viewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema = new Schema<IArticle>(
  {
    articleId:    { type: String, required: true, unique: true, index: true },
    title:        { type: String, required: true },
    summary:      { type: String, required: true },
    fullContent:  { type: String },
    imageUrl:     { type: String },
    sourceUrl:    { type: String, required: true },
    sourceName:   { type: String, required: true },
    category:     { type: String, required: true },
    topics:       { type: [String], default: [] },
    language:     { type: String, enum: ["ne", "en"], required: true },
    origin:       { type: String, enum: ["np", "in", "global"] },
    sourceQuality:{ type: Number },
    publishedAt:  { type: Date, required: true, index: true },
    fetchedAt:    { type: Date, required: true },
    isApproved:   { type: Boolean, default: true },
    isBreaking:   { type: Boolean, default: false },
    readTimeSeconds: { type: Number },
    viewCount:    { type: Number },
  },
  { timestamps: true }
);

// Helpful secondary indexes for the /news/[id] page + admin queries
ArticleSchema.index({ language: 1, publishedAt: -1 });

export const ArticleModel: Model<IArticle> =
  mongoose.models.Article ?? mongoose.model<IArticle>("Article", ArticleSchema);
