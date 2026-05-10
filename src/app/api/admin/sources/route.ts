import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { verifyToken } from "@/lib/auth";

function authCheck(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest) {
  if (!authCheck(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sources: store.getSources() });
}

export async function POST(req: NextRequest) {
  if (!authCheck(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const source = store.addSource(body);
  return NextResponse.json({ source }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!authCheck(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await req.json();
  const ok = store.updateSource(id, updates);
  return NextResponse.json({ success: ok });
}

export async function DELETE(req: NextRequest) {
  if (!authCheck(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const ok = store.deleteSource(id);
  return NextResponse.json({ success: ok });
}
