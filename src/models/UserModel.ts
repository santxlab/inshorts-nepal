import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserPreferences {
  language?: string;
  region?: string;
  topics: string[];          // interested topics (legacy + onboarding picks)
  interested: string[];      // explicitly thumbs-up topics
  notInterested: string[];   // explicitly thumbs-down topics
  updatedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  provider: "email" | "magic_link" | "google" | "phone";
  googleId?: string;
  preferences?: IUserPreferences;
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
    preferences: {
      type: new Schema<IUserPreferences>(
        {
          language:      { type: String },
          region:        { type: String },
          topics:        { type: [String], default: [] },
          interested:    { type: [String], default: [] },
          notInterested: { type: [String], default: [] },
          updatedAt:     { type: Date },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true }
);

// Avoid OverwriteModelError during Next.js hot-reload
export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
