import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const LEGACY_AD_TABLES = [
  "ai_recommendations",
  "budget_history",
  "clicks",
  "conversions",
  "creatives",
  "daily_stats",
  "impressions",
  "native_ad_clicks",
  "native_ad_daily_spend",
  "native_ad_impressions",
  "native_ads",
  "ad_creative_placements",
  "ad_groups",
  "campaigns",
  "advertiser_transactions",
  "advertiser_wallets",
  "advertiser_packages",
  "advertiser_profiles",
  "ad_accounts",
  "inventory_slots",
];

const LEGACY_AD_COLUMNS: { table: string; column: string }[] = [
  { table: "store_customers", column: "advertiser_id" },
  { table: "payment_daily_summary", column: "advertiser_payments_count" },
  { table: "payment_daily_summary", column: "advertiser_payments_successful" },
  { table: "payment_daily_summary", column: "advertiser_payments_failed" },
  { table: "payment_daily_summary", column: "advertiser_payments_pending" },
  { table: "payment_daily_summary", column: "advertiser_revenue_halalas" },
];

export interface LegacyAdvertisingCleanupResult {
  droppedTables: string[];
  droppedColumns: { table: string; column: string }[];
  downgradedUsers: number;
  removedRoles: string[];
  alreadyClean: boolean;
}

export async function runLegacyAdvertisingCleanup(
  pool: Pool,
): Promise<LegacyAdvertisingCleanupResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const beforeTables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)
       ORDER BY table_name`,
      [LEGACY_AD_TABLES],
    );
    const tablesToDrop = beforeTables.rows.map((r) => r.table_name);
    console.log(
      `[ad-cleanup] Found ${tablesToDrop.length} legacy advertising table(s) to drop:`,
      tablesToDrop.join(", ") || "(none)",
    );

    const droppedColumns: { table: string; column: string }[] = [];
    for (const { table, column } of LEGACY_AD_COLUMNS) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = $2`,
        [table, column],
      );
      if (exists.rowCount && exists.rowCount > 0) {
        console.log(`[ad-cleanup] Dropping ${table}.${column}`);
        await client.query(
          `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`,
        );
        droppedColumns.push({ table, column });
      }
    }

    for (const table of LEGACY_AD_TABLES) {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    const afterTables = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [LEGACY_AD_TABLES],
    );
    if (afterTables.rowCount && afterTables.rowCount > 0) {
      throw new Error(
        `[ad-cleanup] Some tables were not dropped: ${afterTables.rows
          .map((r) => r.table_name)
          .join(", ")}`,
      );
    }

    const afterCols = await client.query<{
      table_name: string;
      column_name: string;
    }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (
           column_name ILIKE '%advertiser%'
           OR column_name ILIKE 'native_ad%'
           OR column_name = 'ad_account_id'
           OR column_name = 'ad_group_id'
         )`,
    );
    if (afterCols.rowCount && afterCols.rowCount > 0) {
      throw new Error(
        `[ad-cleanup] Orphan advertiser/ad columns remain: ${afterCols.rows
          .map((r) => `${r.table_name}.${r.column_name}`)
          .join(", ")}`,
      );
    }

    const downgradedUsers = await client.query<{ id: string }>(
      `UPDATE users SET role = 'user'
       WHERE role ILIKE '%advert%'
       RETURNING id`,
    );
    const downgradedCount = downgradedUsers.rowCount ?? 0;
    if (downgradedCount > 0) {
      console.log(
        `[ad-cleanup] Reset ${downgradedCount} user(s) with an advertiser role back to 'user'`,
      );
    }

    const advertiserRoleRows = await client.query<{
      id: string;
      name: string;
    }>(
      `SELECT id, name FROM roles
       WHERE name ILIKE '%advert%' OR name = 'ad_manager'`,
    );
    const removedRoles: string[] = [];
    if (advertiserRoleRows.rowCount && advertiserRoleRows.rowCount > 0) {
      const ids = advertiserRoleRows.rows.map((r) => r.id);
      await client.query(`DELETE FROM user_roles WHERE role_id = ANY($1)`, [
        ids,
      ]);
      await client.query(
        `DELETE FROM role_permissions WHERE role_id = ANY($1)`,
        [ids],
      );
      await client.query(`DELETE FROM roles WHERE id = ANY($1)`, [ids]);
      for (const r of advertiserRoleRows.rows) removedRoles.push(r.name);
      console.log(
        `[ad-cleanup] Removed ${advertiserRoleRows.rowCount} advertiser-related role(s): ${removedRoles.join(", ")}`,
      );
    }

    const remainingAdvertiserUsers = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM users WHERE role ILIKE '%advert%'`,
    );
    if (
      remainingAdvertiserUsers.rows[0]?.count &&
      remainingAdvertiserUsers.rows[0].count > 0
    ) {
      throw new Error(
        `[ad-cleanup] ${remainingAdvertiserUsers.rows[0].count} user(s) still have an advertiser role after cleanup`,
      );
    }

    const remainingAdvertiserRoles = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM roles
       WHERE name ILIKE '%advert%' OR name = 'ad_manager'`,
    );
    if (
      remainingAdvertiserRoles.rows[0]?.count &&
      remainingAdvertiserRoles.rows[0].count > 0
    ) {
      throw new Error(
        `[ad-cleanup] ${remainingAdvertiserRoles.rows[0].count} advertiser-related role(s) still defined in roles after cleanup`,
      );
    }

    await client.query("COMMIT");

    const alreadyClean =
      tablesToDrop.length === 0 &&
      droppedColumns.length === 0 &&
      downgradedCount === 0 &&
      removedRoles.length === 0;

    console.log(
      `[ad-cleanup] Done. Dropped ${tablesToDrop.length} legacy advertising table(s); verified no orphan advertiser columns, users, or roles remain.`,
    );

    return {
      droppedTables: tablesToDrop,
      droppedColumns,
      downgradedUsers: downgradedCount,
      removedRoles,
      alreadyClean,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[ad-cleanup] Failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[ad-cleanup] DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await runLegacyAdvertisingCleanup(pool);
  } finally {
    await pool.end();
  }
}

const invokedDirectly = (() => {
  try {
    const argvPath = process.argv[1] ?? "";
    return (
      argvPath.endsWith("dropLegacyAdvertisingTables.ts") ||
      argvPath.endsWith("dropLegacyAdvertisingTables.js")
    );
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
