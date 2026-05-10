import { NextRequest, NextResponse } from "next/server";
import { adStore } from "@/lib/ad-store";
import { CampaignStatus } from "@/types";

export async function GET() {
  return NextResponse.json({ campaigns: adStore.getAll(), stats: adStore.getStats() });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const campaign = adStore.create(data);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid campaign data" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, ...rest } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (status) {
      adStore.updateStatus(id, status as CampaignStatus);
    } else {
      adStore.update(id, rest);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  adStore.delete(id);
  return NextResponse.json({ success: true });
}
