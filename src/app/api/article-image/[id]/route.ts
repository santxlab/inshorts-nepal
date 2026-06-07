// GET /api/article-image/[id]
// Serves a DALL-E 3 generated article image stored in MongoDB.
// Long cache headers — images are immutable once generated.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ArticleImageModel } from "@/models/ArticleImageModel";

export const dynamic = "force-dynamic";

// Next.js 15+ passes params as a Promise
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  try {
    await connectDB();
    const doc = await ArticleImageModel.findOne(
      { articleId: id },
      { imageData: 1, mimeType: 1 }
    ).lean();

    if (!doc || !doc.imageData) {
      return new NextResponse("Not found", { status: 404 });
    }

    // doc.imageData is a BSON Binary — wrap in a Blob so NextResponse accepts it
    const raw: unknown = doc.imageData;
    const buf: Buffer = Buffer.isBuffer(raw)
      ? (raw as Buffer)
      : Buffer.from(
          raw && typeof raw === "object" && "buffer" in (raw as object)
            ? ((raw as { buffer: ArrayBuffer }).buffer)
            : new ArrayBuffer(0)
        );
    const mime = doc.mimeType ?? "image/jpeg";
    // Slice to get a plain ArrayBuffer (Buffer.buffer can be SharedArrayBuffer
    // in some Node versions which Blob doesn't accept directly).
    const ab: ArrayBuffer = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([ab], { type: mime });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": mime,
        // Cache for 30 days — generated images never change
        "Cache-Control": "public, max-age=2592000, immutable",
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (err) {
    console.error("[article-image] failed:", err instanceof Error ? err.message : err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
