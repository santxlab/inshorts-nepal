import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MagicTokenModel } from "@/models/MagicTokenModel";
import { userStore } from "@/lib/user-store";

const MAX_ATTEMPTS = 5;

/**
 * POST /api/auth/email-verify-code
 * Body: { email, code }
 * Verifies a 6-digit code sent by /api/auth/magic-request (channel: "code").
 * Returns { user, token } on success. Used by the native mobile app.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const normalised = String(email).toLowerCase().trim();
    const cleanCode = String(code).replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "Service unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // Latest unused, unexpired token for this email
    const record = await MagicTokenModel.findOne({
      email: normalised,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return NextResponse.json(
        { error: "Code expired or not found. Request a new one." },
        { status: 401 }
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      record.used = true;
      await record.save();
      return NextResponse.json(
        { error: "Too many wrong attempts. Request a new code." },
        { status: 429 }
      );
    }

    if (record.code !== cleanCode) {
      record.attempts += 1;
      await record.save();
      return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 401 });
    }

    // Success — single-use
    record.used = true;
    await record.save();

    const { user, token } = await userStore.findOrCreateByEmail(normalised, {
      provider: "magic_link",
    });

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("[email-verify-code]", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
