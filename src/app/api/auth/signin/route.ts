import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await userStore.authenticateUser(email, password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ user: result.user, token: result.token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
