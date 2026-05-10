// Sponsored Campaign Store
import { SponsoredCampaign, CampaignStatus } from "@/types";

const campaigns = new Map<string, SponsoredCampaign>();

// Seed demo campaigns
const demoCampaigns: SponsoredCampaign[] = [
  {
    id: "camp-1",
    name: "NMB Bank Q2 2025",
    sponsorName: "NMB Bank",
    creativeType: "inline_card",
    labelType: "Sponsored",
    title: "NMB Bank – Nepal's Digital Banking Leader",
    description: "Open a zero-fee savings account in 3 minutes. Get 8% interest on fixed deposits.",
    imageUrl: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800&auto=format",
    landingUrl: "https://nmbbank.com.np",
    ctaText: "Open Account",
    placementRules: {
      locations: ["home_feed", "category_feed"],
      categories: ["business", "all"],
      provinces: [],
      deviceTargeting: "all",
    },
    frequencyRules: {
      impressionsPerUserPerDay: 3,
      minGapMinutes: 30,
      maxRepeatsPerSession: 2,
      showEveryNCards: 6,
    },
    budget: { type: "impression_cap", cap: 50000, spent: 12340 },
    schedule: {
      startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      priority: 1,
    },
    status: "active",
    stats: { impressions: 12340, clicks: 892, uniqueUsers: 4200, ctr: 7.23 },
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "camp-2",
    name: "Daraz Sale Campaign",
    sponsorName: "Daraz Nepal",
    creativeType: "article_card",
    labelType: "Advertisement",
    title: "Daraz 11.11 Mega Sale – Up to 70% Off",
    description: "Nepal's biggest online sale is here. Shop electronics, fashion & more with free delivery.",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format",
    landingUrl: "https://daraz.com.np",
    ctaText: "Shop Now",
    placementRules: {
      locations: ["home_feed"],
      categories: [],
      provinces: [],
      deviceTargeting: "mobile",
    },
    frequencyRules: {
      impressionsPerUserPerDay: 5,
      minGapMinutes: 20,
      maxRepeatsPerSession: 3,
      showEveryNCards: 8,
    },
    budget: { type: "impression_cap", cap: 100000, spent: 34500 },
    schedule: {
      startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 9 * 86400000).toISOString(),
      priority: 2,
    },
    status: "active",
    stats: { impressions: 34500, clicks: 2100, uniqueUsers: 8900, ctr: 6.09 },
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

demoCampaigns.forEach((c) => campaigns.set(c.id, c));

export const adStore = {
  getAll(): SponsoredCampaign[] {
    return [...campaigns.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getActive(): SponsoredCampaign[] {
    const now = new Date();
    return [...campaigns.values()].filter((c) => {
      if (c.status !== "active") return false;
      if (new Date(c.schedule.startDate) > now) return false;
      if (c.schedule.endDate && new Date(c.schedule.endDate) < now) return false;
      if (c.budget.type === "impression_cap" && c.stats.impressions >= c.budget.cap) return false;
      return true;
    }).sort((a, b) => a.schedule.priority - b.schedule.priority);
  },

  getById(id: string): SponsoredCampaign | undefined {
    return campaigns.get(id);
  },

  create(data: Omit<SponsoredCampaign, "id" | "createdAt" | "updatedAt" | "stats">): SponsoredCampaign {
    const campaign: SponsoredCampaign = {
      ...data,
      id: `camp-${Date.now()}`,
      stats: { impressions: 0, clicks: 0, uniqueUsers: 0, ctr: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    campaigns.set(campaign.id, campaign);
    return campaign;
  },

  update(id: string, data: Partial<SponsoredCampaign>): SponsoredCampaign | null {
    const c = campaigns.get(id);
    if (!c) return null;
    const updated = { ...c, ...data, updatedAt: new Date().toISOString() };
    campaigns.set(id, updated);
    return updated;
  },

  updateStatus(id: string, status: CampaignStatus): boolean {
    const c = campaigns.get(id);
    if (!c) return false;
    campaigns.set(id, { ...c, status, updatedAt: new Date().toISOString() });
    return true;
  },

  recordImpression(id: string, uniqueUser = false): void {
    const c = campaigns.get(id);
    if (!c) return;
    const stats = {
      ...c.stats,
      impressions: c.stats.impressions + 1,
      uniqueUsers: uniqueUser ? c.stats.uniqueUsers + 1 : c.stats.uniqueUsers,
    };
    stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
    campaigns.set(id, { ...c, stats });
  },

  recordClick(id: string): void {
    const c = campaigns.get(id);
    if (!c) return;
    const stats = { ...c.stats, clicks: c.stats.clicks + 1 };
    stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
    campaigns.set(id, { ...c, stats });
  },

  delete(id: string): boolean {
    return campaigns.delete(id);
  },

  getStats() {
    const all = [...campaigns.values()];
    return {
      total: all.length,
      active: all.filter((c) => c.status === "active").length,
      draft: all.filter((c) => c.status === "draft").length,
      totalImpressions: all.reduce((s, c) => s + c.stats.impressions, 0),
      totalClicks: all.reduce((s, c) => s + c.stats.clicks, 0),
      avgCtr: all.length > 0
        ? all.reduce((s, c) => s + c.stats.ctr, 0) / all.length
        : 0,
    };
  },
};
