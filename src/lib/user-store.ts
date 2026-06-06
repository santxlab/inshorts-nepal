// User store — persists to MongoDB when MONGODB_URI is set, falls back to
// in-memory for local dev without a database.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AppUser } from "@/contexts/AuthContext";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/UserModel";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("[SECURITY] JWT_SECRET env var is not set — using insecure default!");
}
const JWT_SECRET = process.env.JWT_SECRET || "inshorts-nepal-secret-2025";

// ── In-memory fallback (no MONGODB_URI) ──────────────────────────────────────
interface MemUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: string;
}
const memUsers = new Map<string, MemUser>();

// ── Helpers ───────────────────────────────────────────────────────────────────
export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

function toPublicUser(u: {
  id?: string;
  _id?: unknown;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string | Date;
}): AppUser {
  return {
    id: u.id ?? String(u._id),
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    isGuest: false,
    createdAt:
      typeof u.createdAt === "string" ? u.createdAt : u.createdAt.toISOString(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
export const userStore = {
  /** Register a new user with email + password. */
  async createUser(name: string, email: string, password: string) {
    const db = await connectDB();

    if (db) {
      const existing = await UserModel.findOne({ email: email.toLowerCase() });
      if (existing) return { error: "Email already registered" };
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        provider: "email",
      });
      const id = String(user._id);
      const token = signToken(id);
      return { user: toPublicUser({ ...user.toObject(), id }), token };
    }

    // — in-memory fallback —
    const existing = [...memUsers.values()].find(
      (u) => u.email === email.toLowerCase()
    );
    if (existing) return { error: "Email already registered" };
    const passwordHash = await bcrypt.hash(password, 10);
    const u: MemUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    memUsers.set(u.id, u);
    return { user: toPublicUser(u), token: signToken(u.id) };
  },

  /** Sign in with email + password. */
  async authenticateUser(email: string, password: string) {
    const db = await connectDB();

    if (db) {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) return { error: "No account found with this email" };
      if (!user.passwordHash)
        return { error: "This account uses magic-link sign-in — check your email" };
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return { error: "Incorrect password" };
      const id = String(user._id);
      return { user: toPublicUser({ ...user.toObject(), id }), token: signToken(id) };
    }

    // — in-memory fallback —
    const user = [...memUsers.values()].find(
      (u) => u.email === email.toLowerCase()
    );
    if (!user) return { error: "No account found with this email" };
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return { error: "Incorrect password" };
    return { user: toPublicUser(user), token: signToken(user.id) };
  },

  /**
   * Find an existing user by email or create a new one.
   * Used by magic-link and (later) Google OAuth flows.
   */
  async findOrCreateByEmail(
    email: string,
    opts: { name?: string; provider?: "magic_link" | "google" | "phone"; googleId?: string } = {}
  ): Promise<{ user: AppUser; token: string }> {
    const db = await connectDB();

    if (db) {
      let user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = await UserModel.create({
          name: opts.name ?? email.split("@")[0],
          email: email.toLowerCase(),
          provider: opts.provider ?? "magic_link",
          googleId: opts.googleId,
        });
      }
      const id = String(user._id);
      return { user: toPublicUser({ ...user.toObject(), id }), token: signToken(id) };
    }

    // — in-memory fallback —
    let u = [...memUsers.values()].find((u) => u.email === email.toLowerCase());
    if (!u) {
      u = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: opts.name ?? email.split("@")[0],
        email: email.toLowerCase(),
        passwordHash: "",
        createdAt: new Date().toISOString(),
      };
      memUsers.set(u.id, u);
    }
    return { user: toPublicUser(u), token: signToken(u.id) };
  },

  /** Verify a JWT and return the AppUser payload embedded in it. */
  verifyToken(token: string): AppUser | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        name?: string;
        email?: string;
      };
      // Trust the signed JWT. For full user data use getUserById.
      return {
        id: payload.sub,
        name: payload.name ?? "",
        email: payload.email ?? "",
        isGuest: false,
        createdAt: "",
      };
    } catch {
      return null;
    }
  },

  /** Look up a user by their MongoDB / in-memory ID. */
  async getUserById(id: string): Promise<AppUser | null> {
    const db = await connectDB();
    if (db) {
      const user = await UserModel.findById(id).catch(() => null);
      if (!user) return null;
      return toPublicUser({ ...user.toObject(), id: String(user._id) });
    }
    const u = memUsers.get(id);
    return u ? toPublicUser(u) : null;
  },

  /** Update a user's profile fields (name, avatarUrl). */
  async updateUser(
    id: string,
    data: { name?: string; avatarUrl?: string }
  ): Promise<AppUser | null> {
    const db = await connectDB();
    if (db) {
      const user = await UserModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true }
      ).catch(() => null);
      if (!user) return null;
      return toPublicUser({ ...user.toObject(), id: String(user._id) });
    }
    // — in-memory fallback —
    const u = memUsers.get(id);
    if (!u) return null;
    if (data.name) u.name = data.name;
    return toPublicUser(u);
  },
};
