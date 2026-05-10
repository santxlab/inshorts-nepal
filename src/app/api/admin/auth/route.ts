import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, signToken, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signToken(username);
  const res = NextResponse.json({ success: true, message: "Logged in" });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  res.cookies.delete("admin_token");
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ authenticated: false });
  const payload = verifyToken(token);
  return NextResponse.json({ authenticated: !!payload, user: payload?.username });
}
