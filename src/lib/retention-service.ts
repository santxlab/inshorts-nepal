// Database retention.
//
// MongoDB here is Atlas on the free tier, which caps at 512 MB. The `articles`
// collection grows ~1,100 docs/day (~2.9 MB) and nothing ever deleted them, so
// it was on track to exhaust the tier in roughly three months and take the
// whole app down with it.
//
// What actually needs to persist in Mongo:
//   • /news/<id> pages, so shared links keep working
//   • the weekly-insight aggregation, which only looks back 7 days
// The feed itself is served from the in-memory store, not from here. So a
// 60-day window is comfortably beyond anything the product reads, while
// capping steady state at ~66k articles (~175 MB) instead of unbounded growth.
import { connectDB } from "./db";
import { ArticleModel } from "@/models/ArticleModel";
import { SummaryModel } from "@/models/SummaryModel";
import { TranslationModel } from "@/models/TranslationModel";

const DEFAULT_RETENTION_DAYS = 60;

// Delete in batches: a single deleteMany over tens of thousands of docs can
// hold locks long enough to stall request handling on a small instance.
const BATCH = 5_000;

export interface RetentionResult {
  articlesDeleted: number;
  summariesDeleted: number;
  translationsDeleted: number;
  cutoff: string;
}

function retentionDays(): number {
  const v = parseInt(process.env.ARTICLE_RETENTION_DAYS ?? "", 10);
  return Number.isFinite(v) && v >= 7 ? v : DEFAULT_RETENTION_DAYS;
}

export async function pruneOldData(): Promise<RetentionResult | null> {
  const conn = await connectDB();
  if (!conn) return null;

  const days = retentionDays();
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  const result: RetentionResult = {
    articlesDeleted: 0,
    summariesDeleted: 0,
    translationsDeleted: 0,
    cutoff: cutoff.toISOString(),
  };

  // 1. Collect the ids we're dropping so their derived rows go with them —
  //    otherwise summaries/translations become orphans that never expire.
  for (;;) {
    const batch = await ArticleModel.find({ publishedAt: { $lt: cutoff } })
      .select({ articleId: 1 })
      .limit(BATCH)
      .lean<{ _id: unknown; articleId: string }[]>();
    if (batch.length === 0) break;

    const ids = batch.map((b) => b.articleId);
    const objectIds = batch.map((b) => b._id);

    const [sum, tr] = await Promise.all([
      SummaryModel.deleteMany({ articleId: { $in: ids } }),
      TranslationModel.deleteMany({ articleId: { $in: ids } }),
    ]);
    result.summariesDeleted += sum.deletedCount ?? 0;
    result.translationsDeleted += tr.deletedCount ?? 0;

    const del = await ArticleModel.deleteMany({ _id: { $in: objectIds } });
    result.articlesDeleted += del.deletedCount ?? 0;

    // Stop if this batch was the last one.
    if (batch.length < BATCH) break;
  }

  if (result.articlesDeleted > 0) {
    console.log(
      `[retention] pruned ${result.articlesDeleted} articles older than ${days}d ` +
      `(+${result.summariesDeleted} summaries, +${result.translationsDeleted} translations)`
    );
  }
  return result;
}
