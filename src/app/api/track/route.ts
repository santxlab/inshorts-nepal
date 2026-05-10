import { NextRequest, NextResponse } from "next/server";
import { installStore } from "@/lib/install-store";

// Public endpoint — called by the app on first open / every session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const platform = (body.platform as string) ?? "web"; // "web" | "android" | "ios"
    const deviceId = (body.deviceId as string) ?? "";
    const version = (body.version as string) ?? "";

    if (!deviceId) {
      return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
    }

    const result = installStore.recordSession(deviceId, platform, version);
    return NextResponse.json({ success: true, isNew: result.isNew });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
