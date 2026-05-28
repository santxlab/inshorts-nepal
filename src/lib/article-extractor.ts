// Full-article extraction (dependency-free).
//
// RSS feeds almost always carry only a short excerpt (the <description> /
// <content:encoded> is 1–3 sentences), so the /news/<id> reader page would
// otherwise show just that stub. When a reader actually opens an article we
// fetch the publisher's page and pull the main body text out with a few HTML
// heuristics, then cache it on the ArticleModel so later opens are instant.
//
// We deliberately avoid jsdom/cheerio/readability here: those drag in heavy
// (and partly native) deps that complicate the Oracle VM build. The regex
// heuristics below are "good enough" for the WordPress/Drupal-style markup the
// 40+ Nepali/English sources we aggregate use; when extraction fails we simply
// fall back to the RSS summary (no regression vs today).

const FETCH_TIMEOUT_MS = 8000;
const UA =
  "Mozilla/5.0 (compatible; InShortsNepalBot/1.0; +https://inshortsnepal.org)";

// Decode the handful of HTML entities that actually appear in body text.
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try { return String.fromCodePoint(parseInt(n, 10)); } catch { return ""; }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ""; }
    });
}

// Remove tags whose text is never article content.
function stripNonContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(nav|header|footer|aside|form|figure|figcaption|svg)\b[\s\S]*?<\/\1>/gi, " ");
}

// Pull the text of every <p> that looks like a real sentence (drops captions,
// share-bar labels, "Published on …" microcopy, etc.).
function paragraphs(html: string): string[] {
  const out: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 40) out.push(text);
  }
  return out;
}

/**
 * Fetch the publisher page at `url` and return the main body as paragraphs
 * joined by blank lines, or null if we couldn't extract anything substantial.
 */
export async function fetchFullArticle(url: string): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (ct && !ct.includes("html")) return null;
    html = await res.text();
  } catch {
    return null; // network error / timeout / blocked → caller falls back to summary
  }

  const cleaned = stripNonContent(html);

  // Prefer the <article> region if the page marks one up; otherwise scan the
  // whole document. If <article> yields too little (some themes use it as a
  // wrapper around teaser cards), fall back to the full-document paragraphs.
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  let paras = paragraphs(articleMatch ? articleMatch[1] : cleaned);
  if (articleMatch && paras.join(" ").length < 200) paras = paragraphs(cleaned);

  const body = paras.join("\n\n").trim();
  if (body.length < 200) return null; // not enough to be worth showing

  // Cap size — some pages dump comments / "related stories" as <p> too.
  return body.length > 8000 ? body.slice(0, 8000) : body;
}
