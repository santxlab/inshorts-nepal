// In-memory user store with bcrypt hashing and JWT tokens
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AppUser } from "@/contexts/AuthContext";

const JWT_SECRET = process.env.JWT_SECRET || "inshorts-nepal-secret-2025";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  isGuest: false;
  createdAt: string;
}

// In-memory store (resets on server restart, fine for prototype)
const users = new Map<string, StoredUser>();

function toPublicUser(u: StoredUser): AppUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    isGuest: false,
    createdAt: u.createdAt,
  };
}

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export const userStore = {
  async createUser(name: string, email: string, password: string) {
    const existing = [...users.values()].find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) return { error: "Email already registered" };

    const passwordHash = await bcrypt.hash(password, 10);
    const user: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      isGuest: false,
      createdAt: new Date().toISOString(),
    };
    users.set(user.id, user);
    const token = signToken(user.id);
    return { user: toPublicUser(user), token };
  },

  async authenticateUser(email: string, password: string) {
    const user = [...users.values()].find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) return { error: "No account found with this email" };
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return { error: "Incorrect password" };
    const token = signToken(user.id);
    return { user: toPublicUser(user), token };
  },

  verifyToken(token: string): AppUser | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
      const user = users.get(payload.sub);
      return user ? toPublicUser(user) : null;
    } catch {
      return null;
    }
  },

  getUserById(id: string): AppUser | null {
    const user = users.get(id);
    return user ? toPublicUser(user) : null;
  },
};
