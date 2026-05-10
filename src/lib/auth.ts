import jwt from "jsonwebtoken";

const SECRET = process.env.ADMIN_JWT_SECRET || "inshorts-nepal-secret";
const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "nepal@admin2024";

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
