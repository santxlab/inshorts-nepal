// Curated category-specific fallback images from Unsplash (free, no API key needed).
// Each category has multiple images; we pick deterministically by article ID hash
// so the same article always gets the same fallback image.

const FALLBACKS: Record<string, string[]> = {
  politics: [
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
    "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=800&q=80",
    "https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=800&q=80",
  ],
  sports: [
    "https://images.unsplash.com/photo-1540747913346-19212a4b3c55?w=800&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  ],
  cricket: [
    "https://images.unsplash.com/photo-1540747913346-19212a4b3c55?w=800&q=80",
    "https://images.unsplash.com/photo-1593766827886-f5cc6bfce19d?w=800&q=80",
  ],
  football: [
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
  ],
  nepse: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  ],
  tech: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
  ],
  health: [
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&q=80",
  ],
  education: [
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
  ],
  bollywood: [
    "https://images.unsplash.com/photo-1540541338537-1220851e961a?w=800&q=80",
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
  ],
  international: [
    "https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=800&q=80",
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80",
  ],
  travel: [
    "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=800&q=80",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  ],
  weather: [
    "https://images.unsplash.com/photo-1504608524841-42584120d693?w=800&q=80",
    "https://images.unsplash.com/photo-1495571758719-6ec1e876d6ae?w=800&q=80",
  ],
  agriculture: [
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80",
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
  ],
  jobs: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
  ],
  breaking: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80",
  ],
  local: [
    "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  ],
  crypto: [
    "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
    "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80",
  ],
  government: [
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
    "https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=800&q=80",
  ],
  startups: [
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
  ],
  // Default Nepal-themed fallbacks
  default: [
    "https://images.unsplash.com/photo-1604537466608-109fa2f16c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=800&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80",
  ],
};

// Simple deterministic hash from string
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getFallbackImage(
  articleId: string,
  topics: string[],
  category?: string
): string {
  // Try topic-specific images first
  for (const topic of topics) {
    const imgs = FALLBACKS[topic];
    if (imgs?.length) {
      return imgs[hashStr(articleId) % imgs.length];
    }
  }
  // Try category
  if (category && FALLBACKS[category]) {
    const imgs = FALLBACKS[category];
    return imgs[hashStr(articleId) % imgs.length];
  }
  // Default Nepal fallback
  const imgs = FALLBACKS.default;
  return imgs[hashStr(articleId) % imgs.length];
}
