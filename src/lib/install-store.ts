// In-memory install & session tracking
// Replace with MongoDB in production for persistence

interface InstallRecord {
  deviceId: string;
  platform: string;
  version: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
}

const installs = new Map<string, InstallRecord>();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export const installStore = {
  recordSession(deviceId: string, platform: string, version: string) {
    const now = new Date().toISOString();
    const existing = installs.get(deviceId);
    const isNew = !existing;

    if (existing) {
      existing.lastSeenAt = now;
      existing.sessionCount++;
      existing.version = version || existing.version;
    } else {
      installs.set(deviceId, {
        deviceId,
        platform,
        version,
        firstSeenAt: now,
        lastSeenAt: now,
        sessionCount: 1,
      });
    }
    return { isNew };
  },

  getStats() {
    const all = Array.from(installs.values());
    const today = todayStr();

    const totalInstalls = all.length;
    const newToday = all.filter((r) => r.firstSeenAt.startsWith(today)).length;
    const activeToday = all.filter((r) => r.lastSeenAt.startsWith(today)).length;

    const byPlatform: Record<string, number> = {};
    all.forEach((r) => {
      byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1;
    });

    // Last 7 days new installs
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      return {
        date: d,
        newInstalls: all.filter((r) => r.firstSeenAt.startsWith(d)).length,
        activeSessions: all.filter((r) => r.lastSeenAt.startsWith(d)).length,
      };
    }).reverse();

    return { totalInstalls, newToday, activeToday, byPlatform, last7 };
  },
};
