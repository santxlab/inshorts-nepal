import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Mandatory-update gate. The mobile app compares its own version against
// minVersion and blocks with an "Update required" screen if it's below.
// Bump MIN_APP_VERSION on the VM (.env + pm2 restart) to force an update.
export async function GET() {
  return NextResponse.json({
    minVersion: process.env.MIN_APP_VERSION || null,
    updateUrl:
      process.env.APP_STORE_URL ||
      "https://play.google.com/store/apps/details?id=org.inshortsnepal.app",
  });
}
