/**
 * Create (or refresh) the «فريق التحرير» reporter account so it appears
 * in the reporter dropdown on the article-create page.
 *
 * Behaviour (all DB writes happen inside a single transaction):
 *   - Generates a strong random temporary password (>= 24 chars, mixed
 *     character classes via `crypto.randomInt`) and hashes it with
 *     bcrypt (cost 12).
 *   - If a user with email `edit@propertymiddleeast.com` already exists,
 *     the row is updated to first/last name = "فريق التحرير", role
 *     `reporter`, status `active`, and the temporary password (rather
 *     than creating a duplicate row). Any previously assigned RBAC
 *     roles are removed and replaced with `reporter` only, so the
 *     account is strictly reporter-scoped.
 *   - Otherwise a new row is inserted with id `reporter-editorial-team`.
 *   - The user is assigned the `reporter` role via `user_roles` so
 *     `/api/admin/users?role=reporter` returns it.
 *   - A `staff` row is ensured (slug `editorial-team`,
 *     `staff_type='reporter'`) so the user can be attributed to
 *     articles — mirroring the auto-creation done by the
 *     `POST /api/admin/users` route.
 *
 * Password handling:
 *   The temporary password is NEVER printed to STDOUT/STDERR (so it
 *   cannot leak into long-lived workflow / deployment logs). It is
 *   written exclusively to a file on disk so the operator can read it
 *   once and then delete the file.
 *
 *   The output path is taken from the env var
 *   `EDITORIAL_TEAM_PASSWORD_FILE`. If unset, a randomly-named file
 *   under `os.tmpdir()` (mode 0600) is used. Only the *path* of that
 *   file is printed to STDOUT.
 *
 * Usage:
 *   tsx scripts/create-editorial-team-reporter.ts
 *   EDITORIAL_TEAM_PASSWORD_FILE=/secure/path tsx scripts/create-editorial-team-reporter.ts
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import ws from "ws";

import * as schema from "../shared/schema.js";

neonConfig.webSocketConstructor = ws;

const REPORTER_EMAIL = "edit@propertymiddleeast.com";
const REPORTER_USER_ID = "reporter-editorial-team";
const REPORTER_FIRST_NAME = "فريق";
const REPORTER_LAST_NAME = "التحرير";
const REPORTER_DISPLAY_NAME = `${REPORTER_FIRST_NAME} ${REPORTER_LAST_NAME}`;
const REPORTER_STAFF_SLUG_BASE = "editorial-team";

const PASSWORD_LENGTH = 24;
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pickRandomChar(charset: string): string {
  return charset[crypto.randomInt(0, charset.length)];
}

function generateStrongPassword(length = PASSWORD_LENGTH): string {
  const required = [
    pickRandomChar(UPPER),
    pickRandomChar(LOWER),
    pickRandomChar(DIGITS),
    pickRandomChar(SYMBOLS),
  ];
  const remaining: string[] = [];
  for (let i = 0; i < length - required.length; i++) {
    remaining.push(pickRandomChar(ALL));
  }
  const all = [...required, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join("");
}

function resolvePasswordOutputPath(): string {
  const fromEnv = process.env.EDITORIAL_TEAM_PASSWORD_FILE;
  if (fromEnv && fromEnv.trim().length > 0) {
    return path.resolve(fromEnv.trim());
  }
  const random = crypto.randomBytes(8).toString("hex");
  return path.join(os.tmpdir(), `editorial-team-password-${random}.txt`);
}

function writePasswordFile(filePath: string, password: string): void {
  // Open with O_WRONLY | O_CREAT | O_TRUNC and mode 0o600 so only the
  // current user can read the password.
  const fd = fs.openSync(filePath, "w", 0o600);
  try {
    fs.writeSync(fd, password + "\n");
  } finally {
    fs.closeSync(fd);
  }
  // Defensive: re-apply restrictive permissions in case umask altered them.
  fs.chmodSync(filePath, 0o600);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const password = generateStrongPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    const result = await db.transaction(async (tx) => {
      const allRoles = await tx.select().from(schema.roles);
      const reporterRole = allRoles.find((r) => r.name === "reporter");
      if (!reporterRole) {
        throw new Error(
          "Required role `reporter` not found in `roles` table. " +
            "Make sure RBAC has been seeded before running this script.",
        );
      }

      const existing = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, REPORTER_EMAIL))
        .limit(1);

      let userId: string;
      let action: "created" | "updated";

      if (existing.length > 0) {
        userId = existing[0].id;
        action = "updated";
        await tx
          .update(schema.users)
          .set({
            passwordHash,
            firstName: REPORTER_FIRST_NAME,
            lastName: REPORTER_LAST_NAME,
            role: "reporter",
            status: "active",
            accountLocked: false,
            failedLoginAttempts: 0,
            isProfileComplete: true,
            mustChangePassword: true,
            deletedAt: null,
          })
          .where(eq(schema.users.id, userId));

        // Strip any RBAC roles other than `reporter` so the account is
        // strictly reporter-scoped (least privilege per task spec).
        await tx
          .delete(schema.userRoles)
          .where(
            and(
              eq(schema.userRoles.userId, userId),
              ne(schema.userRoles.roleId, reporterRole.id),
            ),
          );
      } else {
        userId = REPORTER_USER_ID;
        action = "created";
        await tx.insert(schema.users).values({
          id: userId,
          email: REPORTER_EMAIL,
          passwordHash,
          firstName: REPORTER_FIRST_NAME,
          lastName: REPORTER_LAST_NAME,
          role: "reporter",
          status: "active",
          isProfileComplete: true,
          mustChangePassword: true,
        });
      }

      const existingAssignment = await tx
        .select({ id: schema.userRoles.id })
        .from(schema.userRoles)
        .where(
          and(
            eq(schema.userRoles.userId, userId),
            eq(schema.userRoles.roleId, reporterRole.id),
          ),
        )
        .limit(1);

      if (existingAssignment.length === 0) {
        await tx.insert(schema.userRoles).values({
          userId,
          roleId: reporterRole.id,
        });
      }

      // Ensure a `staff` row exists so the reporter can be attributed
      // to articles (mirrors POST /api/admin/users behaviour).
      const existingStaff = await tx
        .select({ id: schema.staff.id })
        .from(schema.staff)
        .where(eq(schema.staff.userId, userId))
        .limit(1);

      if (existingStaff.length === 0) {
        let slug = REPORTER_STAFF_SLUG_BASE;
        let counter = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const conflict = await tx
            .select({ id: schema.staff.id })
            .from(schema.staff)
            .where(eq(schema.staff.slug, slug))
            .limit(1);
          if (conflict.length === 0) break;
          slug = `${REPORTER_STAFF_SLUG_BASE}-${counter++}`;
        }
        await tx.insert(schema.staff).values({
          userId,
          slug,
          name: REPORTER_DISPLAY_NAME,
          nameAr: REPORTER_DISPLAY_NAME,
          staffType: "reporter",
          isActive: true,
          isVerified: false,
        });
      }

      const verify = await tx
        .select({
          id: schema.users.id,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          role: schema.users.role,
          status: schema.users.status,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (verify.length === 0) {
        throw new Error("Verification failed: could not read user back.");
      }

      return { action, user: verify[0] };
    });

    // Write the password to a private file. The password is NEVER
    // printed to stdout/stderr to avoid leaking into deployment logs.
    const passwordFile = resolvePasswordOutputPath();
    writePasswordFile(passwordFile, password);

    const banner =
      "════════════════════════════════════════════════════════════════════";
    console.log(`\n${banner}`);
    console.log(`EDITORIAL TEAM REPORTER ${result.action.toUpperCase()}`);
    console.log(banner);
    console.log(`   Id:       ${result.user.id}`);
    console.log(`   Email:    ${result.user.email}`);
    console.log(`   Name:     ${result.user.firstName} ${result.user.lastName}`);
    console.log(`   Role:     ${result.user.role}  (rbac role: reporter)`);
    console.log(`   Status:   ${result.user.status}`);
    console.log(`   Password: <written to file, NOT logged>`);
    console.log(`   File:     ${passwordFile}`);
    console.log(
      "   Read the password ONCE with `cat` then delete the file.",
    );
    console.log(`${banner}\n`);
  } catch (error) {
    console.error("Failed to create editorial team reporter:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
