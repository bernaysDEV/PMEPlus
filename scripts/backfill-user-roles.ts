/**
 * Backfill the `user_roles` table from the legacy `users.role` column.
 *
 * Historically some users (e.g. the bootstrap admin created via
 * `scripts/create-admin.ts` and the `admin@propertymiddleeast.com` account
 * provisioned for the new brand) were given a role only via the legacy
 * `users.role` text column without a corresponding row in `user_roles`. Those
 * users therefore appeared in role-filtered queries through the
 * `users.role` fallback used by `requireRole(...)`, but failed
 * `requirePermission(...)` checks because the runtime authorization layer
 * resolves permissions through `user_roles → role_permissions → permissions`.
 *
 * For every active, non-deleted user whose `users.role` matches one of the
 * canonical role names defined in `STAFF_ROLE_NAMES` (plus `reader`), this
 * script inserts a `user_roles` row pointing at the matching `roles.id` if
 * (and only if) the user does not already have any `user_roles` row for that
 * role. Existing assignments are never modified or removed, so it is safe to
 * re-run on production.
 *
 * Usage:
 *   tsx scripts/backfill-user-roles.ts
 *
 * Required env:
 *   DATABASE_URL
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import ws from "ws";

import * as schema from "../shared/schema.js";
import { STAFF_ROLE_NAMES, ROLE_NAMES } from "../shared/rbac-constants.js";

neonConfig.webSocketConstructor = ws;

/** Drizzle DB instance bound to the project schema. */
export type AppDatabase = NeonDatabase<typeof schema>;

export interface BackfillSummary {
  rolesConsidered: string[];
  candidatesByRole: Record<string, number>;
  inserted: number;
  alreadyAssigned: number;
  insertedDetails: Array<{ userId: string; email: string | null; role: string }>;
}

/**
 * Internal worker — exported so the server can invoke it on startup with the
 * shared connection pool. Returns a summary describing what was inserted.
 */
export async function backfillUserRolesFromLegacy(
  db: AppDatabase,
): Promise<BackfillSummary> {
  // Roles we are willing to mirror from the legacy column. We include
  // `reader` so previously-bootstrapped reader accounts also get an explicit
  // RBAC link if they ever had one assigned via the legacy column.
  const targetRoleNames: string[] = [
    ...STAFF_ROLE_NAMES,
    ROLE_NAMES.READER,
  ];

  const summary: BackfillSummary = {
    rolesConsidered: targetRoleNames,
    candidatesByRole: Object.fromEntries(targetRoleNames.map((r) => [r, 0])),
    inserted: 0,
    alreadyAssigned: 0,
    insertedDetails: [],
  };

  const allRoles = await db.select().from(schema.roles);
  const rolesByName = new Map(allRoles.map((r) => [r.name, r]));

  for (const roleName of targetRoleNames) {
    const role = rolesByName.get(roleName);
    if (!role) {
      // The roles table doesn't have this role yet — nothing we can do.
      // `seed-roles.ts` should have created it; skip silently.
      continue;
    }

    // Find candidate users: legacy users.role matches AND row is not soft-
    // deleted. We use lower() comparison just in case the legacy column was
    // stored with mixed casing somewhere.
    const candidates = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(
        and(
          sql`lower(${schema.users.role}) = lower(${roleName})`,
          isNull(schema.users.deletedAt),
        ),
      );

    summary.candidatesByRole[roleName] = candidates.length;
    if (candidates.length === 0) continue;

    const candidateIds = candidates.map((c) => c.id);

    // Find which of those already have a user_roles row for this role —
    // skip those.
    const existing = await db
      .select({ userId: schema.userRoles.userId })
      .from(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.roleId, role.id),
          inArray(schema.userRoles.userId, candidateIds),
        ),
      );
    const alreadyAssigned = new Set(existing.map((r) => r.userId));
    summary.alreadyAssigned += alreadyAssigned.size;

    const toInsert = candidates.filter((c) => !alreadyAssigned.has(c.id));
    if (toInsert.length === 0) continue;

    await db
      .insert(schema.userRoles)
      .values(
        toInsert.map((c) => ({
          userId: c.id,
          roleId: role.id,
        })),
      )
      .onConflictDoNothing();

    summary.inserted += toInsert.length;
    for (const c of toInsert) {
      summary.insertedDetails.push({
        userId: c.id,
        email: c.email,
        role: roleName,
      });
    }
  }

  return summary;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    console.log("🔁 Backfilling user_roles from legacy users.role column...\n");
    const summary = await backfillUserRolesFromLegacy(db);

    const banner =
      "════════════════════════════════════════════════════════════════════";
    console.log(banner);
    console.log("📋 USER_ROLES BACKFILL SUMMARY");
    console.log(banner);
    for (const role of summary.rolesConsidered) {
      const count = summary.candidatesByRole[role] || 0;
      console.log(`  • ${role.padEnd(22)}  candidates=${String(count).padStart(4)}`);
    }
    console.log(banner);
    console.log(
      `  inserted=${summary.inserted}  already-assigned=${summary.alreadyAssigned}`,
    );
    if (summary.insertedDetails.length > 0) {
      console.log("\nNewly linked:");
      for (const d of summary.insertedDetails) {
        console.log(`  + ${d.email ?? "(no email)"} → ${d.role}  (id=${d.userId})`);
      }
    }
    console.log(`${banner}\n`);
    console.log("✅ user_roles backfill complete.");
  } catch (error) {
    console.error("❌ Failed to backfill user_roles:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run main() when invoked directly (e.g. `tsx scripts/backfill-user-roles.ts`).
const invokedDirectly = (() => {
  try {
    const argv = process.argv[1] || "";
    return argv.endsWith("backfill-user-roles.ts") ||
      argv.endsWith("backfill-user-roles.js");
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main();
}
