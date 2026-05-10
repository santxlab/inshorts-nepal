// Social Media Auto-Publisher
// Supports: Facebook Pages, Instagram (via Graph API), X/Twitter API v2
// Requires environment variables — see .env.example
import { SocialPost, SocialPlatform, NewsArticle } from "@/types";

const posts: SocialPost[] = [];

// ─── Platform API clients ────────────────────────────────────────────────────

async function publishToFacebook(article: NewsArticle, text: string): Promise<string> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) throw new Error("Facebook credentials not configured");

  const body: Record<string, string> = {
    message: text,
    link: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org"}/news/${article.id}`,
    access_token: token,
  };
  if (article.imageUrl) body.picture = article.imageUrl;

  const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Facebook error: ${err.error?.message}`);
  }
  const data = await res.json();
  return data.id;
}

async function publishToInstagram(article: NewsArticle, text: string): Promise<string> {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN; // Instagram uses FB Graph API
  if (!accountId || !token) throw new Error("Instagram credentials not configured");
  if (!article.imageUrl) throw new Error("Instagram requires an image");

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v18.0/${accountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: article.imageUrl,
        caption: text,
        access_token: token,
      }),
    }
  );
  if (!containerRes.ok) throw new Error("Failed to create Instagram media container");
  const { id: containerId } = await containerRes.json();

  // Step 2: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: token }),
    }
  );
  if (!publishRes.ok) throw new Error("Failed to publish Instagram media");
  const { id } = await publishRes.json();
  return id;
}

async function publishToTwitter(text: string): Promise<string> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Twitter/X credentials not configured");
  }

  // Twitter API v2 — POST /2/tweets
  // Note: OAuth 1.0a required for posting (user context)
  // For simplicity we use the v2 endpoint; production needs OAuth1 signing
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // In production: generate OAuth 1.0a Authorization header
      "Authorization": `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Twitter error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data?.id ?? "unknown";
}

// ─── Main publisher ──────────────────────────────────────────────────────────

function buildPostText(article: NewsArticle, platform: SocialPlatform): string {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://inshortsnepal.org"}/news/${article.id}`;
  const hashtags = "#InShortsNepal #Nepal #NepalNews";

  if (platform === "twitter") {
    // Twitter 280 char limit
    const title = article.title.slice(0, 200);
    return `${title}\n\n${url}\n${hashtags}`;
  }

  return `📰 ${article.title}\n\n${article.summary.slice(0, 400)}\n\n🔗 ${url}\n\n${hashtags}`;
}

export const socialPublisher = {
  async publish(
    article: NewsArticle,
    platforms: SocialPlatform[]
  ): Promise<SocialPost[]> {
    const results: SocialPost[] = [];

    for (const platform of platforms) {
      const text = buildPostText(article, platform);
      const post: SocialPost = {
        id: `post-${Date.now()}-${platform}`,
        platform,
        articleId: article.id,
        articleTitle: article.title,
        content: text,
        imageUrl: article.imageUrl,
        url: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/news/${article.id}`,
        status: "pending",
        createdAt: new Date().toISOString(),
        clicks: 0,
      };

      try {
        let platformPostId: string;

        if (platform === "facebook") platformPostId = await publishToFacebook(article, text);
        else if (platform === "instagram") platformPostId = await publishToInstagram(article, text);
        else platformPostId = await publishToTwitter(text);

        post.status = "published";
        post.platformPostId = platformPostId;
        post.publishedAt = new Date().toISOString();
      } catch (err) {
        post.status = "failed";
        post.error = (err as Error).message;
      }

      posts.unshift(post);
      results.push(post);
    }

    return results;
  },

  getPosts(limit = 50): SocialPost[] {
    return posts.slice(0, limit);
  },

  getPost(id: string): SocialPost | undefined {
    return posts.find((p) => p.id === id);
  },

  getStats() {
    return {
      total: posts.length,
      published: posts.filter((p) => p.status === "published").length,
      failed: posts.filter((p) => p.status === "failed").length,
      byPlatform: {
        facebook: posts.filter((p) => p.platform === "facebook").length,
        instagram: posts.filter((p) => p.platform === "instagram").length,
        twitter: posts.filter((p) => p.platform === "twitter").length,
      },
    };
  },
};
