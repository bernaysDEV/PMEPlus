/**
 * Seed the `roles` table from ROLE_NAMES + ROLE_LABELS_AR + ROLE_DESCRIPTIONS_AR
 * defined in `shared/rbac-constants.ts`. Idempotent: existing rows (matched by
 * `name`) are updated; missing rows are inserted; rows are never deleted.
 *
 * Usage:
 *   tsx scripts/seed-roles.ts
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import * as schema from "../shared/schema.js";
import {
  ROLE_NAMES,
  ROLE_LABELS_AR,
  ROLE_DESCRIPTIONS_AR,
  STAFF_ROLE_NAMES,
} from "../shared/rbac-constants.js";

neonConfig.webSocketConstructor = ws;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    const allRoleNames = Object.values(ROLE_NAMES) as string[];
    const staffSet = new Set<string>(STAFF_ROLE_NAMES as readonly string[]);
    console.log(`Seeding ${allRoleNames.length} roles...`);

    let inserted = 0;
    let updated = 0;

    for (const name of allRoleNames) {
      const nameAr = (ROLE_LABELS_AR as Record<string, string>)[name] ?? name;
      const description =
        (ROLE_DESCRIPTIONS_AR as Record<string, string>)[name] ?? null;
      const isSystem = staffSet.has(name) || name === ROLE_NAMES.READER;

      const result = await db.execute(sql`
        INSERT INTO roles (name, name_ar, description, is_system)
        VALUES (${name}, ${nameAr}, ${description}, ${isSystem})
        ON CONFLICT (name) DO UPDATE SET
          name_ar = EXCLUDED.name_ar,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);

      const row = (result as any).rows?.[0];
      if (row?.inserted) inserted++;
      else updated++;
    }

    console.log(
      `Done. Inserted: ${inserted}, Updated: ${updated}, Total: ${allRoleNames.length}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
