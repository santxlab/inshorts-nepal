import jwt from "jsonwebtoken";

// In production these MUST be set via environment variables.
// Falling back to hardcoded values is intentionally insecure — only acceptable in local dev.
if (process.env.NODE_ENV === "production") {
  if (!process.env.ADMIN_JWT_SECRET) console.error("[SECURITY] ADMIN_JWT_SECRET env var is not set — using insecure default!");
  if (!process.env.ADMIN_PASSWORD)   console.error("[SECURITY] ADMIN_PASSWORD env var is not set — using insecure default!");
}

const SECRET     = process.env.ADMIN_JWT_SECRET || "inshorts-nepal-secret";
const ADMIN_USER = process.env.ADMIN_USERNAME   || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD   || "nepal@admin2024";

export function verifyCredentials(username: string, password: string): boolean {
  return username === ADMIN_USER && password === ADMIN_PASS;
}

export function signToken(username: string): string {
  return jwt.sign({ username, role: "admin" }, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { username: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as { username: string; role: string };
  } catch {
    return null;
  }
}
