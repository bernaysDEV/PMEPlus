/**
 * Sync the `role_permissions` table with the canonical permission map defined
 * in `shared/rbac-constants.ts` (`ROLE_PERMISSIONS_MAP`).
 *
 * For every role declared in `ROLE_PERMISSIONS_MAP` whose row exists in the
 * `roles` table, this script will:
 *   1. Look up the matching `permissions.id` for each permission code (codes
 *      that don't exist in the DB are reported and skipped).
 *   2. Replace the role's `role_permissions` rows with the desired set
 *      (insert-missing + delete-extras), so the table mirrors the map exactly.
 *      Roles whose map entry contains the wildcard `"*"` get every permission
 *      currently registered in the `permissions` table.
 *
 * The script never touches roles that are not present in the map (e.g. custom
 * roles created at runtime via the RBAC UI), so it is safe to re-run on
 * production.
 *
 * Usage:
 *   tsx scripts/sync-role-permissions.ts
 *
 * Required env:
 *   DATABASE_URL
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, inArray, and } from "drizzle-orm";
import ws from "ws";

import * as schema from "../shared/schema.js";
import { ROLE_PERMISSIONS_MAP } from "../shared/rbac-constants.js";

neonConfig.webSocketConstructor = ws;

interface RoleSyncSummary {
  roleName: string;
  roleId: string | null;
  desired: number;
  added: number;
  removed: number;
  unchanged: number;
  missingCodes: string[];
  skipped?: string;
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
    console.log("🔐 Syncing role_permissions with ROLE_PERMISSIONS_MAP...\n");

    const allRoles = await db.select().from(schema.roles);
    const allPermissions = await db.select().from(schema.permissions);
    const permissionByCode = new Map(allPermissions.map((p) => [p.code, p]));

    const summaries: RoleSyncSummary[] = [];

    for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      const role = allRoles.find((r) => r.name === roleName);
      if (!role) {
        summaries.push({
          roleName,
          roleId: null,
          desired: 0,
          added: 0,
          removed: 0,
          unchanged: 0,
          missingCodes: [],
          skipped: "role row not found in `roles` table",
        });
        continue;
      }

      // Resolve desired permission codes. Wildcard "*" expands to every
      // permission *currently registered in the DB*, which is the source of
      // truth used by the runtime authorization checks. (Using the constants
      // file would silently drift the moment a new permission is added in the
      // DB without updating the constants.)
      const wantedCodes: string[] = codes.includes("*")
        ? allPermissions.map((p) => p.code)
        : Array.from(new Set(codes));

      const missingCodes: string[] = [];
      const wantedPermissionIds: string[] = [];
      for (const code of wantedCodes) {
        const perm = permissionByCode.get(code);
        if (!perm) {
          missingCodes.push(code);
          continue;
        }
        wantedPermissionIds.push(perm.id);
      }

      // Fetch existing role_permissions for this role
      const existing = await db
        .select()
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, role.id));
      const existingPermissionIds = new Set(existing.map((rp) => rp.permissionId));
      const wantedSet = new Set(wantedPermissionIds);

      // INSERT missing
      const toInsert = wantedPermissionIds.filter(
        (pid) => !existingPermissionIds.has(pid),
      );
      if (toInsert.length > 0) {
        await db
          .insert(schema.rolePermissions)
          .values(
            toInsert.map((permissionId) => ({ roleId: role.id, permissionId })),
          )
          .onConflictDoNothing();
      }

      // DELETE extras
      const toRemove = Array.from(existingPermissionIds).filter(
        (pid) => !wantedSet.has(pid),
      );
      if (toRemove.length > 0) {
        await db
          .delete(schema.rolePermissions)
          .where(
            and(
              eq(schema.rolePermissions.roleId, role.id),
              inArray(schema.rolePermissions.permissionId, toRemove),
            ),
          );
      }

      summaries.push({
        roleName,
        roleId: role.id,
        desired: wantedPermissionIds.length,
        added: toInsert.length,
        removed: toRemove.length,
        unchanged: wantedPermissionIds.length - toInsert.length,
        missingCodes,
      });
    }

    // ---- Summary ----------------------------------------------------------
    const banner =
      "════════════════════════════════════════════════════════════════════";
    console.log(banner);
    console.log("📋 ROLE PERMISSIONS SYNC SUMMARY");
    console.log(banner);

    for (const s of summaries) {
      if (s.skipped) {
        console.log(`  • ${s.roleName.padEnd(22)}  ⚠ skipped (${s.skipped})`);
        continue;
      }
      console.log(
        `  • ${s.roleName.padEnd(22)}  total=${String(s.desired).padStart(3)}  +${String(s.added).padStart(3)}  -${String(s.removed).padStart(3)}  (unchanged=${s.unchanged})`,
      );
      if (s.missingCodes.length > 0) {
        console.log(
          `      ⚠ missing permission codes (not in DB): ${s.missingCodes.join(", ")}`,
        );
      }
    }
    console.log(`${banner}\n`);
    console.log("✅ role_permissions is now in sync with ROLE_PERMISSIONS_MAP.");
  } catch (error) {
    console.error("❌ Failed to sync role permissions:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
