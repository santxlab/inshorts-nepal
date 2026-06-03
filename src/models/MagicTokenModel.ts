import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMagicToken extends Document {
  email: string;
  token: string;
  code?: string;        // 6-digit numeric code for native app sign-in
  attempts: number;     // failed code-verify attempts (lock after 5)
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const MagicTokenSchema = new Schema<IMagicToken>(
  {
    email:     { type: String, required: true, lowercase: true, trim: true },
    token:     { type: String, required: true, unique: true },
    code:      { type: String, index: true },
    attempts:  { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    used:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// MongoDB TTL index — automatically deletes expired tokens from the collection
MagicTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Avoid OverwriteModelError during Next.js hot-reload
export const MagicTokenModel: Model<IMagicToken> =
  mongoose.models.MagicToken ?? mongoose.model<IMagicToken>("MagicToken", MagicTokenSchema);
