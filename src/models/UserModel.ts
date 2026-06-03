import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider: "email" | "magic_link" | "google" | "phone";
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    avatarUrl:    { type: String },
    provider:     { type: String, enum: ["email", "magic_link", "google", "phone"], default: "email" },
    googleId:     { type: String },
  },
  { timestamps: true }
);

// Avoid OverwriteModelError during Next.js hot-reload
export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
