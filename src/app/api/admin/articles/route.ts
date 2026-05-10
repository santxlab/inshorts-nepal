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
  const articles = store.getAllArticles();
  const stats = store.getStats();
  return NextResponse.json({ articles, stats });
}

export async function PATCH(req: NextRequest) {
  if (!authCheck(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action } = await req.json();
  let ok = false;
  if (action === "approve") ok = store.approveArticle(id);
  else if (action === "delete") ok = store.deleteArticle(id);
  return NextResponse.json({ success: ok });
}

export async function DELETE(req: NextRequest) {
  if (!authCheck(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Prefer query param (?id=...) — bodies on DELETE are unreliable across proxies
  const id = req.nextUrl.searchParams.get("id")
    || await req.json().then((b) => b.id).catch(() => null);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = store.deleteArticle(id);
  return NextResponse.json({ success: ok });
}
