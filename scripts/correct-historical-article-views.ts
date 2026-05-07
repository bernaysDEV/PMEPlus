/**
 * One-off correction for inflated historical `articles.views` counts.
 *
 * Background
 * ----------
 * Until task #24, every accepted click on an Arabic article incremented
 * `articles.views` by a random integer in the range 5..10 (boost defined in
 * `server/routes.ts` and `server/storage.ts:incrementArticleViews`). As a
 * result, the stored view counts on every published Arabic article are
 * roughly 5x–10x the real number of clicks.
 *
 * Task #24 changed `incrementArticleViews` so a click now adds exactly +1.
 * This script performs the documented one-off correction to bring historical
 * counts in line with the new accounting before they are read by editors,
 * advertisers, or public analytics.
 *
 * Strategy
 * --------
 * The historical boost values were the integers {5, 6, 7, 8, 9, 10} chosen
 * uniformly at random, so the expected boost per click is the arithmetic
 * mean: (5+6+7+8+9+10) / 6 = 7.5.
 *
 *   corrected_views = GREATEST(1, ROUND(views / 7.5))   when views > 0
 *   corrected_views = 0                                  when views = 0
 *
 * Notes:
 *   - The floor of 1 prevents a previously-clicked article from dropping
 *     to "0 views", which would mislead editors into thinking it was never
 *     read. Articles that were genuinely never clicked stay at 0.
 *   - Standard rounding (ROUND in PostgreSQL: round-half-away-from-zero)
 *     is good enough for this one-off cleanup; we are correcting an
 *     already-noisy estimate, not computing exact attribution.
 *   - The correction is applied as a single UPDATE so it is run exactly
 *     once and is trivially auditable.
 *   - News articles in the English (`en_articles`) table and the mobile
 *     click endpoints still apply a random 5–10 boost
 *     and are intentionally out of scope here — see task #25's parent
 *     description, which is scoped to `articles.views`.
 *
 * Usage
 * -----
 *   npx tsx scripts/correct-historical-article-views.ts --dry-run
 *   npx tsx scripts/correct-historical-article-views.ts --apply
 *   npx tsx scripts/correct-historical-article-views.ts --apply --force
 *
 * The script refuses to write without `--apply`. `--dry-run` (the default)
 * only prints before/after summary statistics so the change can be reviewed.
 *
 * Idempotency guard
 * -----------------
 * On a successful `--apply`, the script writes a Postgres column comment
 * on `articles.views` recording the run timestamp. Subsequent `--apply`
 * runs see that marker and abort, so a second run cannot accidentally
 * deflate counts again. Pass `--force` to override (e.g. if the marker
 * needs to be re-applied after a database restore).
 */

import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import { articles } from "../shared/schema";

const HISTORICAL_AVERAGE_BOOST = 7.5;

// Sentinel substring stored in the `articles.views` column comment after a
// successful run. Presence of this substring means the correction has
// already been applied and a re-run would double-deflate the data.
const APPLIED_MARKER = "[task-25:historical-views-corrected]";

type Stats = {
  totalArticles: number;
  articlesWithViews: number;
  sumViews: number;
  maxViews: number;
  avgViews: number;
};

async function fetchStats(): Promise<Stats> {
  const [row] = await db
    .select({
      totalArticles: sql<number>`COUNT(*)::int`,
      articlesWithViews: sql<number>`COUNT(*) FILTER (WHERE ${articles.views} > 0)::int`,
      sumViews: sql<number>`COALESCE(SUM(${articles.views}), 0)::bigint`,
      maxViews: sql<number>`COALESCE(MAX(${articles.views}), 0)::int`,
      avgViews: sql<number>`COALESCE(AVG(${articles.views}) FILTER (WHERE ${articles.views} > 0), 0)::float`,
    })
    .from(articles);

  return {
    totalArticles: Number(row.totalArticles),
    articlesWithViews: Number(row.articlesWithViews),
    sumViews: Number(row.sumViews),
    maxViews: Number(row.maxViews),
    avgViews: Number(row.avgViews),
  };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function printStats(label: string, s: Stats) {
  console.log(`\n[${label}]`);
  console.log(`  total articles:       ${fmt(s.totalArticles)}`);
  console.log(`  articles with views:  ${fmt(s.articlesWithViews)}`);
  console.log(`  sum(views):           ${fmt(s.sumViews)}`);
  console.log(`  max(views):           ${fmt(s.maxViews)}`);
  console.log(`  avg(views) [>0]:      ${s.avgViews.toFixed(2)}`);
}

async function fetchAppliedMarker(): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT col_description(
      'public.articles'::regclass,
      (SELECT attnum FROM pg_attribute
        WHERE attrelid = 'public.articles'::regclass
          AND attname = 'views')
    ) AS comment
  `);
  const rows = (result as unknown as { rows?: Array<{ comment: string | null }> }).rows ?? [];
  const comment = rows[0]?.comment ?? null;
  if (comment && comment.includes(APPLIED_MARKER)) {
    return comment;
  }
  return null;
}

async function writeAppliedMarker(): Promise<void> {
  const stamp = new Date().toISOString();
  const comment = `${APPLIED_MARKER} divisor=${HISTORICAL_AVERAGE_BOOST} appliedAt=${stamp} ` +
    `formula=GREATEST(1,ROUND(views/divisor)) when views>0`;
  // Comment text is built from constants and an ISO timestamp — no user input.
  await db.execute(sql.raw(`COMMENT ON COLUMN public.articles.views IS '${comment.replace(/'/g, "''")}';`));
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const force = args.has("--force");
  const dryRun = !apply;

  console.log("=== Correct historical articles.views ===");
  console.log(`mode: ${dryRun ? "DRY RUN (no writes)" : "APPLY (will UPDATE)"}`);
  console.log(`divisor (historical average boost): ${HISTORICAL_AVERAGE_BOOST}`);

  const existingMarker = await fetchAppliedMarker();
  if (existingMarker) {
    console.log(`\nidempotency marker found on articles.views:\n  ${existingMarker}`);
    if (apply && !force) {
      console.error(
        "\nRefusing to re-apply: the correction has already been run.\n" +
        "Pass --force only if you have intentionally restored a pre-correction\n" +
        "snapshot and need to re-apply (e.g. after a database restore)."
      );
      process.exitCode = 2;
      return;
    }
  }

  const before = await fetchStats();
  printStats("BEFORE", before);

  // Project what the corrected stats will look like, without writing.
  const [projection] = await db
    .select({
      projectedSum: sql<number>`COALESCE(SUM(GREATEST(1, ROUND(${articles.views} / ${HISTORICAL_AVERAGE_BOOST}::numeric))) FILTER (WHERE ${articles.views} > 0), 0)::bigint`,
      projectedMax: sql<number>`COALESCE(MAX(GREATEST(1, ROUND(${articles.views} / ${HISTORICAL_AVERAGE_BOOST}::numeric))) FILTER (WHERE ${articles.views} > 0), 0)::int`,
      projectedAvg: sql<number>`COALESCE(AVG(GREATEST(1, ROUND(${articles.views} / ${HISTORICAL_AVERAGE_BOOST}::numeric))) FILTER (WHERE ${articles.views} > 0), 0)::float`,
    })
    .from(articles);

  const projected: Stats = {
    totalArticles: before.totalArticles,
    articlesWithViews: before.articlesWithViews,
    sumViews: Number(projection.projectedSum),
    maxViews: Number(projection.projectedMax),
    avgViews: Number(projection.projectedAvg),
  };
  printStats("PROJECTED AFTER", projected);

  if (dryRun) {
    console.log(
      "\nDry run complete. Re-run with --apply to perform the update."
    );
    return;
  }

  console.log("\nApplying correction…");
  const result = await db.execute(sql`
    UPDATE ${articles}
    SET views = GREATEST(1, ROUND(views / ${HISTORICAL_AVERAGE_BOOST}::numeric))::int
    WHERE views > 0
  `);
  const rowCount =
    typeof (result as { rowCount?: number }).rowCount === "number"
      ? (result as { rowCount?: number }).rowCount
      : undefined;
  console.log(`UPDATE rows affected: ${rowCount ?? "n/a"}`);

  await writeAppliedMarker();
  console.log(`Wrote idempotency marker on articles.views (${APPLIED_MARKER}).`);

  const after = await fetchStats();
  printStats("AFTER", after);

  console.log("\nDone. New clicks will increment by exactly +1 going forward.");
}

main()
  .catch((err) => {
    console.error("[correct-historical-article-views] FAILED:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
