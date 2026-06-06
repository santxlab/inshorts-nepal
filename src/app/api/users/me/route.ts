import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";

/**
 * PATCH /api/users/me
 * Update the current user's profile (name, avatarUrl).
 * Auth: Authorization: Bearer <jwt>
 * Body: { name?: string; avatarUrl?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = userStore.verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, avatarUrl } = body as { name?: string; avatarUrl?: string };

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const updates: { name?: string; avatarUrl?: string } = {};
    if (name !== undefined) updates.name = name.trim();
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    const updated = await userStore.updateUser(payload.id, updates);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[PATCH /api/users/me]", err);
    return NextResponse.json({ error: "Update failed. Please try again." }, { status: 500 });
  }
}
