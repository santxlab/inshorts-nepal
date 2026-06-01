import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/UserModel";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await connectDB();
  if (!db) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit    = 20;
  const search   = searchParams.get("q") ?? "";
  const provider = searchParams.get("provider") ?? "";

  const filter: Record<string, unknown> = {};
  if (search)   filter.$or = [
    { name:  { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  if (provider) filter.provider = provider;

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name email provider createdAt"),
    UserModel.countDocuments(filter),
  ]);

  // Provider breakdown counts
  const [googleCount, phoneCount, magicCount, emailCount] = await Promise.all([
    UserModel.countDocuments({ provider: "google" }),
    UserModel.countDocuments({ provider: "phone" }),
    UserModel.countDocuments({ provider: "magic_link" }),
    UserModel.countDocuments({ provider: "email" }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
    breakdown: { google: googleCount, phone: phoneCount, magic_link: magicCount, email: emailCount },
  });
}
