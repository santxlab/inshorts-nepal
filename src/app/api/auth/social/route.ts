import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";

/**
 * POST /api/auth/social
 * Called after Firebase client-side auth (Google Sign-In or Phone OTP).
 * Firebase has already verified the identity; we just find-or-create the user
 * in our own DB and return our JWT.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name, provider, providerId } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const validProviders = ["google", "phone"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const { user, token } = await userStore.findOrCreateByEmail(
      email.toLowerCase().trim(),
      {
        name: name ?? email.split("@")[0],
        provider,
        googleId: provider === "google" ? providerId : undefined,
      }
    );

    return NextResponse.json({ user, token });
  } catch (err) {
    console.error("[auth/social]", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
