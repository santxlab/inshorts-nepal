import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MagicTokenModel } from "@/models/MagicTokenModel";
import { userStore } from "@/lib/user-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const record = await MagicTokenModel.findOne({ token });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });
    }
    if (record.used) {
      return NextResponse.json(
        { error: "This link has already been used. Request a new one." },
        { status: 401 }
      );
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This link has expired. Request a new one." },
        { status: 401 }
      );
    }

    // Mark token as used (single-use)
    record.used = true;
    await record.save();

    // Find or create the user
    const { user, token: jwt } = await userStore.findOrCreateByEmail(record.email, {
      provider: "magic_link",
    });

    return NextResponse.json({ user, token: jwt });
  } catch (err) {
    console.error("[magic-verify]", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
