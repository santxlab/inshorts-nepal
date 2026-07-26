// Phase Option-A: DALL-E 3 image generation for articles without photos.
// Called as a background job after each RSS fetch batch. Generates at most
// MAX_PER_BATCH images per run so cost stays predictable (~$0.04/image × 10 = $0.40/run).
//
// Flow:
//   1. Filter articles that have no imageUrl AND haven't been generated yet.
//   2. For each, build a safe descriptive prompt from the title + topics.
//   3. Call DALL-E 3 → get a temporary CDN URL (valid ~1 hour).
//   4. Download the binary immediately.
//   5. Persist to ArticleImageModel (MongoDB).
//   6. Update ArticleModel.imageUrl → /api/article-image/{id} (our serving endpoint).
//   7. Patch the in-memory store so the change is visible without a restart.

import { connectDB } from "@/lib/db";
import { ArticleImageModel } from "@/models/ArticleImageModel";
import { ArticleModel } from "@/models/ArticleModel";
import { store } from "@/lib/store";
import type { NewsArticle } from "@/types";

const IMAGE_API_URL = "https://api.openai.com/v1/images/generations";
// gpt-image-1, not dall-e-3 — see callImageModel() for why.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
// "low" | "medium" | "high". medium ≈ $0.042/image at 1024x1024 and is plenty
// for a card backdrop that sits behind a scrim with a headline over it.
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY ?? "medium";
const MAX_PER_BATCH = 10;
const IMAGE_TIMEOUT_MS = 90_000;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org";

export interface GenerateResult {
  generated: number;
  skipped: number;
}

interface ArticleMinimal {
  id: string;
  title: string;
  topics?: string[];
  category?: string;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Prompt builder — creates a newsroom-style DALL-E prompt from metadata
// ---------------------------------------------------------------------------
function buildPrompt(title: string, topics: string[], category: string): string {
  const topicStr = topics.slice(0, 3).join(", ") || category;
  return (
    `Photorealistic editorial news photograph for a Nepali news article titled: ` +
    `"${title.slice(0, 120)}". Topic: ${topicStr}. ` +
    `High quality journalism photo, natural lighting, professional composition. ` +
    `No text, no watermarks, no logos.`
  );
}

// ---------------------------------------------------------------------------
// Image generation call — returns the raw PNG bytes, or null.
//
// Model note: this used to call `dall-e-3` with response_format:"url", then
// download from the returned CDN link. The account backing OPENAI_API_KEY does
// NOT have dall-e-3 enabled (it 404s on the model), only `gpt-image-1`, so the
// whole job silently produced nothing. gpt-image-1 also ALWAYS returns
// base64 inline and rejects `response_format` outright — so there is no
// temporary URL to download and the extra fetch hop is gone entirely.
// ---------------------------------------------------------------------------
async function callImageModel(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: IMAGE_QUALITY,
      }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[image-generator] ${IMAGE_MODEL} ${res.status}: ${body.slice(0, 300)}`);
      return null;
    }

    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[image-generator] response contained no b64_json");
      return null;
    }
    return Buffer.from(b64, "base64");
  } catch (err) {
    console.error(
      "[image-generator] image call failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main export: generate images for articles that have none
// ---------------------------------------------------------------------------
export async function generateImagesForArticles(
  articles: ArticleMinimal[]
): Promise<GenerateResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { generated: 0, skipped: articles.length };
  }
  if (articles.length === 0) {
    return { generated: 0, skipped: 0 };
  }

  await connectDB();

  // 1. Skip articles we've already generated images for
  const ids = articles.map((a) => a.id);
  const existing = await ArticleImageModel.find(
    { articleId: { $in: ids } },
    { articleId: 1 }
  ).lean();
  const existingSet = new Set(existing.map((e) => e.articleId));

  const pending = articles
    .filter((a) => !existingSet.has(a.id))
    .slice(0, MAX_PER_BATCH);

  if (pending.length === 0) {
    return { generated: 0, skipped: articles.length };
  }

  let generated = 0;

  for (const article of pending) {
    const prompt = buildPrompt(
      article.title,
      article.topics ?? [],
      article.category ?? "news"
    );

    // 2. Generate — bytes come back inline as base64, no CDN hop needed.
    const imageData = await callImageModel(prompt);
    if (!imageData) continue;

    const servingUrl = `${BASE_URL}/api/article-image/${article.id}`;

    try {
      // 3. Persist image binary in MongoDB. gpt-image-1 returns PNG.
      await ArticleImageModel.create({
        articleId: article.id,
        imageData,
        mimeType: "image/png",
        generatedAt: new Date(),
      });

      // 4. Update ArticleModel so the URL survives restarts
      await ArticleModel.updateOne(
        { articleId: article.id },
        { $set: { imageUrl: servingUrl } }
      );

      // 5. Patch in-memory store so the change is live immediately.
      // getAllArticles() shallow-copies the array but NOT the objects, so
      // mutating a found article updates the original store entry.
      const memArticle = store.getAllArticles().find((a: NewsArticle) => a.id === article.id);
      if (memArticle) memArticle.imageUrl = servingUrl;

      generated++;
      console.log(`[image-generator] ✓ generated for ${article.id}`);
    } catch (err) {
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        // Duplicate key — another worker beat us to it. Fine.
        continue;
      }
      console.error(
        "[image-generator] persist failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  if (generated > 0) {
    console.log(`[image-generator] batch done — generated: ${generated}, pending was: ${pending.length}`);
  }

  return { generated, skipped: articles.length - generated };
}
