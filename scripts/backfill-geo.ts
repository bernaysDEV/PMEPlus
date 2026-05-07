import { db } from "../server/db";
import { articles } from "../shared/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { extractGeoLocations } from "../server/services/geoExtractionService";

async function countMissing(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNull(articles.geoLocations)));
  return rows[0]?.count ?? 0;
}

const BATCH_SIZE = 50;

async function backfill() {
  console.log("[GeoBackfill] Starting...");

  let totalProcessed = 0;
  let totalFailed = 0;
  let batchNum = 0;

  while (true) {
    const missingArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
      })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          isNull(articles.geoLocations)
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(BATCH_SIZE);

    if (missingArticles.length === 0) {
      console.log("[GeoBackfill] No more articles missing geo_locations.");
      break;
    }

    batchNum++;
    console.log(`[GeoBackfill] Batch ${batchNum}: processing ${missingArticles.length} articles`);

    let batchFailed = 0;
    for (const article of missingArticles) {
      try {
        const locations = await extractGeoLocations(article.title, article.content);
        await db.update(articles)
          .set({ geoLocations: locations.length > 0 ? locations : [] })
          .where(eq(articles.id, article.id));
        console.log(`  [${totalProcessed + 1}] ${article.title.substring(0, 50)} → ${locations.length} locations`);
        totalProcessed++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        batchFailed++;
        totalFailed++;
        console.error(`  FAIL: ${article.title.substring(0, 50)} - ${err.message}`);
      }
    }

    // Safety: if every article in the batch failed, abort to avoid an infinite loop.
    if (batchFailed === missingArticles.length) {
      const remaining = await countMissing();
      console.error(`[GeoBackfill] Entire batch failed — aborting to avoid infinite loop.`);
      console.error(`[GeoBackfill] Aborted: ${totalProcessed} processed, ${totalFailed} failed, ${remaining} still missing.`);
      process.exit(1);
    }
  }

  const remaining = await countMissing();
  console.log(`[GeoBackfill] Done: ${totalProcessed} processed, ${totalFailed} failed, ${remaining} still missing.`);
  process.exit(totalFailed > 0 || remaining > 0 ? 1 : 0);
}

backfill();
