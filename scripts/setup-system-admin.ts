/**
 * Setup the new system administrator account `hi@letsolvv.com`.
 *
 * This script:
 *   1. Generates a strong random password (>= 24 chars, mixed character classes).
 *   2. Creates the user (or refreshes its password) and assigns the
 *      `system_admin` and `admin` roles.
 *   3. Verifies that the new user passes `userHasPermission` for an
 *      arbitrary permission (proving the superuser flow works).
 *   4. Removes the legacy admin (`admin@sabq.sa` / `admin-sabq`) along with
 *      its `user_roles`, `user_permission_overrides`, and any active
 *      session rows that reference it.
 *
 * The generated password is printed to STDOUT once; it is never persisted to
 * disk by this script.
 *
 * Usage:
 *   tsx scripts/setup-system-admin.ts
 *
 * Optional env:
 *   ADMIN_PASSWORD          override the random password (not recommended)
 *   SYSTEM_ADMIN_USER_ID    override the user id (default: admin-system)
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import ws from "ws";

import * as schema from "../shared/schema.js";
import { userHasPermission } from "../server/rbac.js";

neonConfig.webSocketConstructor = ws;

const NEW_ADMIN_EMAIL = "hi@letsolvv.com";
const DEFAULT_NEW_ADMIN_USER_ID = "admin-system";

const LEGACY_ADMIN_EMAIL = "admin@sabq.sa";
const LEGACY_ADMIN_USER_ID = "admin-sabq";

const PASSWORD_LENGTH = 24;
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omit confusing chars
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pickRandomChar(charset: string): string {
  // crypto.randomInt is uniformly distributed
  return charset[crypto.randomInt(0, charset.length)];
}

function generateStrongPassword(length = PASSWORD_LENGTH): string {
  const required = [
    pickRandomChar(UPPER),
    pickRandomChar(LOWER),
    pickRandomChar(DIGITS),
    pickRandomChar(SYMBOLS),
  ];
  const remainingLength = length - required.length;
  const remaining: string[] = [];
  for (let i = 0; i < remainingLength; i++) {
    remaining.push(pickRandomChar(ALL));
  }
  const all = [...required, ...remaining];
  // Fisher–Yates shuffle with crypto-safe randomness
  for (let i = all.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join("");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const newAdminUserId =
    process.env.SYSTEM_ADMIN_USER_ID || DEFAULT_NEW_ADMIN_USER_ID;
  const adminPassword =
    process.env.ADMIN_PASSWORD || generateStrongPassword(PASSWORD_LENGTH);
  const usingProvidedPassword = !!process.env.ADMIN_PASSWORD;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    console.log("🔐 Setting up system administrator account...");

    // ---- 1. Ensure required roles exist ----------------------------------
    const allRoles = await db.select().from(schema.roles);
    const systemAdminRole = allRoles.find((r) => r.name === "system_admin");
    const adminRole = allRoles.find((r) => r.name === "admin");

    if (!systemAdminRole || !adminRole) {
      console.error(
        "❌ Required roles not found. Make sure RBAC has been seeded " +
          "(roles `system_admin` and `admin` must exist).",
      );
      process.exit(1);
    }

    // ---- 2. Create or refresh the new system admin -----------------------
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const [adminUser] = await db
      .insert(schema.users)
      .values({
        id: newAdminUserId,
        email: NEW_ADMIN_EMAIL,
        passwordHash,
        firstName: "System",
        lastName: "Administrator",
        status: "active",
        isProfileComplete: true,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          passwordHash,
          firstName: "System",
          lastName: "Administrator",
          status: "active",
          isProfileComplete: true,
          role: "admin",
          accountLocked: false,
          failedLoginAttempts: 0,
        },
      })
      .returning();

    console.log(`✅ System admin row ready: ${adminUser.email} (id=${adminUser.id})`);

    // ---- 3. Assign system_admin and admin roles --------------------------
    await db
      .insert(schema.userRoles)
      .values({ userId: adminUser.id, roleId: systemAdminRole.id })
      .onConflictDoNothing();
    await db
      .insert(schema.userRoles)
      .values({ userId: adminUser.id, roleId: adminRole.id })
      .onConflictDoNothing();
    console.log("✅ Assigned roles: system_admin, admin");

    // ---- 4. Verify the user is recognised as a superuser by RBAC -------
    // Use the real `userHasPermission` from server/rbac.ts so we exercise the
    // exact authorisation path the application uses at runtime.
    const assignedRoles = await db
      .select({ name: schema.roles.name })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, adminUser.id));

    const passesPermissionCheck = await userHasPermission(
      adminUser.id,
      "articles.delete",
    );

    if (!passesPermissionCheck) {
      console.error(
        "❌ Verification failed: userHasPermission(adminUser, 'articles.delete') " +
          "returned false — new admin is not recognised as a superuser.",
      );
      process.exit(1);
    }
    console.log(
      `✅ Superuser check passed (roles: ${assignedRoles
        .map((r) => r.name)
        .join(", ")}); userHasPermission('articles.delete') = true.`,
    );

    // ---- 5. Remove the legacy admin and its dependencies -----------------
    const legacyUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, LEGACY_ADMIN_EMAIL))
      .limit(1);

    const legacyIds = new Set<string>();
    if (legacyUsers.length > 0) legacyIds.add(legacyUsers[0].id);
    legacyIds.add(LEGACY_ADMIN_USER_ID); // also try the well-known legacy id

    // Only run session cleanup if the `sessions` table actually exists in
    // this database (some deployments use Redis-only sessions and have no
    // corresponding table).
    const sessionsTable = await db.execute(
      sql`SELECT to_regclass('public.sessions') AS regclass`,
    );
    const sessionsTableExists =
      (sessionsTable.rows?.[0] as { regclass?: string | null } | undefined)
        ?.regclass != null;

    for (const legacyId of Array.from(legacyIds)) {
      // Cleanup dependent rows first (FKs may already cascade, but be safe).
      await db
        .delete(schema.userRoles)
        .where(eq(schema.userRoles.userId, legacyId));
      await db
        .delete(schema.userPermissionOverrides)
        .where(eq(schema.userPermissionOverrides.userId, legacyId));

      // Invalidate any active passport sessions that reference this user.
      if (sessionsTableExists) {
        try {
          await db.execute(
            sql`DELETE FROM sessions WHERE sess->'passport'->>'user' = ${legacyId}`,
          );
        } catch (err) {
          console.warn(
            `⚠ Could not clean sessions for legacy id=${legacyId}: ${
              (err as Error).message
            }`,
          );
        }
      }

      const deleted = await db
        .delete(schema.users)
        .where(eq(schema.users.id, legacyId))
        .returning({ id: schema.users.id, email: schema.users.email });

      if (deleted.length > 0) {
        console.log(
          `🗑️  Removed legacy admin: ${deleted[0].email} (id=${deleted[0].id})`,
        );
      }
    }

    // ---- 6. Print credentials once --------------------------------------
    const banner =
      "════════════════════════════════════════════════════════════════════";
    console.log(`\n${banner}`);
    console.log("🎉 SYSTEM ADMIN READY");
    console.log(banner);
    console.log(`   Email:    ${NEW_ADMIN_EMAIL}`);
    if (usingProvidedPassword) {
      console.log(
        "   Password: (taken from ADMIN_PASSWORD env var — not printed)",
      );
    } else {
      console.log(`   Password: ${adminPassword}`);
      console.log(
        "   ⚠  This password is shown ONCE and is NOT stored anywhere on disk.",
      );
      console.log(
        "      Save it in your password manager NOW; it cannot be recovered.",
      );
    }
    console.log(`${banner}\n`);
  } catch (error) {
    console.error("❌ Failed to set up system admin:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
