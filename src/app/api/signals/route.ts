// Wave 2 — POST /api/signals
// The mobile app sends a batch of behavior events (read/skip/save/share/click/
// dwell/etc.) for an anonymous deviceId. Server upserts the per-device profile.
//
// Body shape:
//   { deviceId, lang?, events: SignalEvent[] }
//
// Each event includes topics + sourceName + language inline so the server
// doesn't need to look up the article (and so signals work even for articles
// no longer in the in-memory store).
import { NextRequest, NextResponse } from "next/server";
import { loadProfile, saveProfile } from "@/lib/user-behavior-store";
import { applySignal, SignalEvent } from "@/lib/behavior-server";

const MAX_EVENTS_PER_REQUEST = 50;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deviceId: string | undefined =
      body.deviceId || req.headers.get("x-device-id") || undefined;
    const events: SignalEvent[] = Array.isArray(body.events) ? body.events : [];

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }
    if (events.length === 0) {
      return NextResponse.json({ success: true, applied: 0 });
    }
    if (events.length > MAX_EVENTS_PER_REQUEST) {
      events.length = MAX_EVENTS_PER_REQUEST;
    }

    const profile = await loadProfile(deviceId);
    let applied = 0;
    for (const ev of events) {
      if (!ev || typeof ev !== "object" || !ev.type) continue;
      applySignal(profile, ev);
      applied++;
    }
    await saveProfile(deviceId, profile);

    return NextResponse.json({ success: true, applied });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
