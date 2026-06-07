// Stores AI-generated article images (DALL-E 3) as binary blobs in MongoDB.
// Kept separate from ArticleModel to avoid bloating the articles collection.
// Images are served via /api/article-image/[id].
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IArticleImage extends Document {
  articleId: string;
  imageData: Buffer;
  mimeType: string;
  generatedAt: Date;
}

const ArticleImageSchema = new Schema<IArticleImage>({
  articleId:   { type: String, required: true, unique: true, index: true },
  imageData:   { type: Buffer, required: true },
  mimeType:    { type: String, default: "image/jpeg" },
  generatedAt: { type: Date, default: Date.now },
});

export const ArticleImageModel: Model<IArticleImage> =
  mongoose.models.ArticleImage ??
  mongoose.model<IArticleImage>("ArticleImage", ArticleImageSchema);
