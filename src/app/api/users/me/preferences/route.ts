import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";

function authUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = userStore.verifyToken(token);
  return payload?.id ?? null;
}

/**
 * GET /api/users/me/preferences
 * Returns the signed-in user's saved feed preferences.
 */
export async function GET(req: NextRequest) {
  const id = authUserId(req);
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const preferences = await userStore.getPreferences(id);
  return NextResponse.json({ preferences });
}

/**
 * PUT /api/users/me/preferences
 * Upsert the signed-in user's feed preferences so they sync across devices.
 * Body: { language?, region?, topics?: string[], interested?: string[], notInterested?: string[] }
 */
export async function PUT(req: NextRequest) {
  const id = authUserId(req);
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const preferences = await userStore.updatePreferences(id, {
      language: typeof body.language === "string" ? body.language : undefined,
      region: typeof body.region === "string" ? body.region : undefined,
      topics: Array.isArray(body.topics) ? body.topics : [],
      interested: Array.isArray(body.interested) ? body.interested : [],
      notInterested: Array.isArray(body.notInterested) ? body.notInterested : [],
    });
    return NextResponse.json({ preferences });
  } catch (err) {
    console.error("[PUT /api/users/me/preferences]", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
