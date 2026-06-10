import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateInsight } from "@/lib/weekly-insight-service";

export async function GET(req: NextRequest) {
  const lang = (req.nextUrl.searchParams.get("lang") ?? "en") as "ne" | "en";
  if (lang !== "ne" && lang !== "en") {
    return NextResponse.json({ error: "invalid lang" }, { status: 400 });
  }

  try {
    const insight = await getOrGenerateInsight(lang);
    if (!insight) {
      return NextResponse.json({ error: "no insight available" }, { status: 404 });
    }
    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[/api/insights/current]", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
