// Wave 2 — Persistence for user behavior profiles.
// MongoDB-backed (per-device document), with an in-memory fallback that
// mirrors push-manager's resilience pattern.
import { connectDB } from "./db";
import { UserBehaviorModel, IUserBehavior } from "@/models/UserBehaviorModel";
import { BehaviorProfile, defaultProfile, Daypart } from "./behavior-server";

// In-memory fallback (used when MongoDB is unreachable)
const memStore = new Map<string, BehaviorProfile>();

function toProfile(doc: IUserBehavior): BehaviorProfile {
  const base = defaultProfile();
  return {
    topics:         (doc.topicScores  as BehaviorProfile["topics"])  ?? {},
    sources:        (doc.sourceScores as Record<string, number>)     ?? {},
    dayparts:       {
      morning:   (doc.dayparts?.morning   as Record<string, number>) ?? {},
      afternoon: (doc.dayparts?.afternoon as Record<string, number>) ?? {},
      evening:   (doc.dayparts?.evening   as Record<string, number>) ?? {},
      night:     (doc.dayparts?.night     as Record<string, number>) ?? {},
    },
    language:       doc.langPref ?? base.language,
    signals:        doc.signals  ?? base.signals,
    seenArticleIds: doc.seenArticleIds ?? [],
    recentDepths:   doc.recentDepths ?? [],
    totalRead:      doc.totalRead ?? 0,
    totalSkips:     doc.totalSkips ?? 0,
    mutedSources:   doc.mutedSources ?? [],
    hiddenTopics:   doc.hiddenTopics ?? [],
  };
}

function toDoc(deviceId: string, p: BehaviorProfile): Partial<IUserBehavior> {
  return {
    deviceId,
    topicScores:  p.topics,
    sourceScores: p.sources,
    dayparts: {
      morning:   p.dayparts.morning   ?? {},
      afternoon: p.dayparts.afternoon ?? {},
      evening:   p.dayparts.evening   ?? {},
      night:     p.dayparts.night     ?? {},
    } as Record<Daypart, Record<string, number>>,
    langPref:       p.language,
    signals:        p.signals,
    seenArticleIds: p.seenArticleIds,
    recentDepths:   p.recentDepths,
    totalRead:      p.totalRead,
    totalSkips:     p.totalSkips,
    mutedSources:   p.mutedSources,
    hiddenTopics:   p.hiddenTopics,
  };
}

async function dbOk(): Promise<boolean> {
  const conn = await connectDB();
  return conn !== null;
}

export async function loadProfile(deviceId: string): Promise<BehaviorProfile> {
  if (await dbOk()) {
    try {
      const doc = await UserBehaviorModel.findOne({ deviceId }).lean<IUserBehavior>();
      if (doc) return toProfile(doc);
    } catch (err) {
      console.error("[user-behavior-store] DB load failed:", err);
    }
  }
  return memStore.get(deviceId) ?? defaultProfile();
}

export async function saveProfile(deviceId: string, profile: BehaviorProfile): Promise<void> {
  if (await dbOk()) {
    try {
      await UserBehaviorModel.findOneAndUpdate(
        { deviceId },
        toDoc(deviceId, profile),
        { upsert: true, new: true }
      );
      return;
    } catch (err) {
      console.error("[user-behavior-store] DB save failed:", err);
    }
  }
  memStore.set(deviceId, profile);
}
