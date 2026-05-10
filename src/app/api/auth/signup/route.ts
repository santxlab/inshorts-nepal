import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const result = await userStore.createUser(name, email, password);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ user: result.user, token: result.token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
