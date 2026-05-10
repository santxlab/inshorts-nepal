// Ad serving engine: frequency control, anti-fatigue, placement logic
import { SponsoredCampaign, PlacementLocation } from "@/types";
import { adStore } from "./ad-store";

const SESSION_KEY = "inshorts-nepal-ad-session";
const DAILY_KEY = "inshorts-nepal-ad-daily";

interface AdSession {
  date: string;
  // campaignId → count shown this session
  sessionCounts: Record<string, number>;
  // campaignId → last shown timestamp
  lastShown: Record<string, number>;
  // campaignId → daily count
  dailyCounts: Record<string, number>;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function loadSession(): AdSession {
  if (typeof window === "undefined") return {
    date: todayStr(), sessionCounts: {}, lastShown: {}, dailyCounts: {}
  };
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const s: AdSession = JSON.parse(raw);
      // Reset daily counts if new day
      if (s.date !== todayStr()) {
        return { date: todayStr(), sessionCounts: s.sessionCounts, lastShown: s.lastShown, dailyCounts: {} };
      }
      return s;
    }
  } catch { /* ignore */ }
  return { date: todayStr(), sessionCounts: {}, lastShown: {}, dailyCounts: {} };
}

function saveSession(s: AdSession) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Check if a campaign should be shown to this user right now
function canShow(campaign: SponsoredCampaign, session: AdSession): boolean {
  const rules = campaign.frequencyRules;
  const id = campaign.id;

  // Session cap
  if ((session.sessionCounts[id] ?? 0) >= rules.maxRepeatsPerSession) return false;

  // Daily cap
  if ((session.dailyCounts[id] ?? 0) >= rules.impressionsPerUserPerDay) return false;

  // Min gap
  const lastMs = session.lastShown[id] ?? 0;
  const gapMs = rules.minGapMinutes * 60 * 1000;
  if (Date.now() - lastMs < gapMs) return false;

  return true;
}

// Record that a campaign was shown
export function recordAdShown(campaignId: string) {
  const session = loadSession();
  session.sessionCounts[campaignId] = (session.sessionCounts[campaignId] ?? 0) + 1;
  session.dailyCounts[campaignId] = (session.dailyCounts[campaignId] ?? 0) + 1;
  session.lastShown[campaignId] = Date.now();
  saveSession(session);

  // Track server-side impression
  fetch("/api/ads/impression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId }),
  }).catch(() => {});
}

// Get the best campaign to show at a given card position
export function getCampaignForPosition(
  cardIndex: number,
  location: PlacementLocation,
  activeCampaigns: SponsoredCampaign[]
): SponsoredCampaign | null {
  if (typeof window === "undefined") return null;

  const session = loadSession();
  const eligible = activeCampaigns.filter((c) => {
    // Check placement
    if (!c.placementRules.locations.includes(location)) return false;
    // Check frequency rules
    if (!canShow(c, session)) return false;
    // Check if this card index is a slot (every N cards)
    if (cardIndex % c.frequencyRules.showEveryNCards !== 0) return false;
    return true;
  });

  // Return highest priority eligible campaign
  return eligible.sort((a, b) => a.schedule.priority - b.schedule.priority)[0] ?? null;
}

// Server-side: get campaigns for feed insertion
export function getActiveCampaignsForFeed(location: PlacementLocation): SponsoredCampaign[] {
  return adStore.getActive().filter((c) =>
    c.placementRules.locations.includes(location)
  );
}
