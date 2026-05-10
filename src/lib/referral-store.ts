// Referral system: codes, tracking, fraud detection, rewards
import { ReferralCode, ReferralEvent, ReferralConfig } from "@/types";
import crypto from "crypto";

// In-memory stores
const codes = new Map<string, ReferralCode>();
const events: ReferralEvent[] = [];
const deviceIdMap = new Map<string, string>(); // deviceId → userId (fraud detection)
const ipCount = new Map<string, number>();      // IP → signup count today

// Default referral config
let config: ReferralConfig = {
  clickReward: 0,
  installReward: 5,
  signupReward: 20,
  firstActionReward: 10,
  cooldownHours: 24,
  maxRewardsPerReferrer: 100,
  campaignActive: true,
  campaignStartDate: new Date().toISOString(),
  campaignEndDate: new Date(Date.now() + 90 * 86400000).toISOString(),
};

function generateCode(userId: string): string {
  const hash = crypto.createHash("sha256").update(userId + Date.now()).digest("hex");
  return hash.slice(0, 8).toUpperCase();
}

function isCampaignActive(): boolean {
  if (!config.campaignActive) return false;
  const now = new Date();
  if (new Date(config.campaignStartDate) > now) return false;
  if (new Date(config.campaignEndDate) < now) return false;
  return true;
}

export const referralStore = {
  // ─── Code management ───────────────────────────────────────────────────────
  getOrCreateCode(userId: string, userName: string): ReferralCode {
    const existing = [...codes.values()].find((c) => c.userId === userId);
    if (existing) return existing;

    const code = generateCode(userId);
    const ref: ReferralCode = {
      code,
      userId,
      userName,
      createdAt: new Date().toISOString(),
      clicks: 0,
      installs: 0,
      signups: 0,
      rewardsCredited: 0,
      isActive: true,
    };
    codes.set(code, ref);
    return ref;
  },

  getCode(code: string): ReferralCode | undefined {
    return codes.get(code.toUpperCase());
  },

  getAllCodes(): ReferralCode[] {
    return [...codes.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // ─── Event tracking ────────────────────────────────────────────────────────
  trackEvent(
    code: string,
    eventType: ReferralEvent["eventType"],
    opts: { deviceId?: string; ip?: string; userId?: string; sessionId?: string }
  ): { success: boolean; reward: number; fraudFlags: string[] } {
    const ref = codes.get(code.toUpperCase());
    if (!ref || !ref.isActive) return { success: false, reward: 0, fraudFlags: ["invalid_code"] };
    if (!isCampaignActive()) return { success: false, reward: 0, fraudFlags: ["campaign_inactive"] };

    const fraudFlags: string[] = [];

    // ── Fraud checks ──
    // Self-referral
    if (opts.userId && opts.userId === ref.userId) {
      fraudFlags.push("self_referral");
    }

    // Device reuse (reinstall abuse)
    if (opts.deviceId) {
      const prevUser = deviceIdMap.get(opts.deviceId);
      if (prevUser && prevUser !== opts.userId) {
        fraudFlags.push("device_reuse");
      }
      deviceIdMap.set(opts.deviceId, opts.userId ?? code);
    }

    // IP abuse (multiple signups from same IP)
    if (opts.ip && eventType === "signup") {
      const count = ipCount.get(opts.ip) ?? 0;
      if (count >= 3) fraudFlags.push("ip_abuse");
      ipCount.set(opts.ip, count + 1);
    }

    // Duplicate event prevention
    const alreadyDone = events.find(
      (e) => e.code === code && e.eventType === eventType && e.deviceId === opts.deviceId
    );
    if (alreadyDone) {
      fraudFlags.push("duplicate_event");
    }

    // Reward cap
    if (ref.rewardsCredited >= config.maxRewardsPerReferrer) {
      fraudFlags.push("reward_cap_reached");
    }

    const isFraud = fraudFlags.some((f) =>
      ["self_referral", "duplicate_event", "ip_abuse", "reward_cap_reached"].includes(f)
    );

    // Calculate reward
    const rewardMap: Record<ReferralEvent["eventType"], number> = {
      click: config.clickReward,
      install: config.installReward,
      signup: config.signupReward,
      first_action: config.firstActionReward,
    };
    const reward = isFraud ? 0 : rewardMap[eventType];

    // Record event
    const event: ReferralEvent = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: code.toUpperCase(),
      referrerId: ref.userId,
      eventType,
      timestamp: new Date().toISOString(),
      deviceId: opts.deviceId,
      ip: opts.ip,
      userId: opts.userId,
      sessionId: opts.sessionId,
      rewarded: reward > 0,
      rewardAmount: reward,
      fraudFlags,
    };
    events.push(event);

    // Update code stats
    if (!isFraud) {
      const updated = { ...ref };
      if (eventType === "click") updated.clicks++;
      if (eventType === "install") updated.installs++;
      if (eventType === "signup") updated.signups++;
      if (reward > 0) updated.rewardsCredited += reward;
      codes.set(code.toUpperCase(), updated);
    }

    return { success: true, reward, fraudFlags };
  },

  getEvents(code?: string): ReferralEvent[] {
    return code
      ? events.filter((e) => e.code === code.toUpperCase())
      : [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getStats() {
    const allCodes = [...codes.values()];
    return {
      totalCodes: allCodes.length,
      totalClicks: allCodes.reduce((s, c) => s + c.clicks, 0),
      totalInstalls: allCodes.reduce((s, c) => s + c.installs, 0),
      totalSignups: allCodes.reduce((s, c) => s + c.signups, 0),
      totalRewardsIssued: allCodes.reduce((s, c) => s + c.rewardsCredited, 0),
      conversionRate: allCodes.reduce((s, c) => s + c.clicks, 0) > 0
        ? (allCodes.reduce((s, c) => s + c.signups, 0) /
           allCodes.reduce((s, c) => s + c.clicks, 0)) * 100
        : 0,
      fraudEvents: events.filter((e) => e.fraudFlags.length > 0).length,
    };
  },

  // ─── Config management ─────────────────────────────────────────────────────
  getConfig(): ReferralConfig { return config; },
  updateConfig(patch: Partial<ReferralConfig>): ReferralConfig {
    config = { ...config, ...patch };
    return config;
  },
};
