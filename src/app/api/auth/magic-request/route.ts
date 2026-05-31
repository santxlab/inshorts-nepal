import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { MagicTokenModel } from "@/models/MagicTokenModel";
import { sendMagicLinkEmail } from "@/lib/resend";

const APP_URL = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Rate-limit: max 3 magic link requests per email per 10 minutes (in-memory, resets on restart).
// For production, replace with Redis or a DB-backed counter.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 3) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalised = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalised)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (isRateLimited(normalised)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const db = await connectDB();
    if (db) {
      // Invalidate any existing unused tokens for this email
      await MagicTokenModel.updateMany(
        { email: normalised, used: false },
        { used: true }
      );
      await MagicTokenModel.create({ email: normalised, token, expiresAt });
    }
    // Note: without MongoDB the token is not persisted — magic link won't work in
    // local dev unless MONGODB_URI is set.

    const magicUrl = `${APP_URL}/auth/verify?token=${token}`;
    await sendMagicLinkEmail(normalised, magicUrl);

    // Always return the same message to avoid email enumeration
    return NextResponse.json({ message: "Check your email for the sign-in link." });
  } catch (err) {
    console.error("[magic-request]", err);
    return NextResponse.json({ error: "Failed to send email. Try again." }, { status: 500 });
  }
}
