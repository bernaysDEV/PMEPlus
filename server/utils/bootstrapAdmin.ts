import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "../../shared/schema.js";

export const SYSTEM_ADMIN_EMAIL = "hi@letsolvv.com";
export const SYSTEM_ADMIN_USER_ID = "admin-system";

async function ensureAdminRoles(
  db: NeonDatabase<typeof schema>,
  userId: string,
) {
  const allRoles = await db.select().from(schema.roles);
  const targetRoles = ["system_admin", "admin"] as const;

  for (const roleName of targetRoles) {
    const role = allRoles.find((r) => r.name === roleName);
    if (!role) {
      console.warn(
        `[Bootstrap] Role '${roleName}' not found; skipping assignment`,
      );
      continue;
    }
    await db
      .insert(schema.userRoles)
      .values({ userId, roleId: role.id })
      .onConflictDoNothing();
  }
}

export async function bootstrapAdmin(db: NeonDatabase<typeof schema>) {
  const adminEmail = SYSTEM_ADMIN_EMAIL;
  const adminUserId = SYSTEM_ADMIN_USER_ID;

  const existingUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1);

  if (existingUsers.length > 0) {
    const existing = existingUsers[0];
    console.log(`[Bootstrap] System admin already exists: ${adminEmail}`);
    await ensureAdminRoles(db, existing.id);
    return {
      success: true,
      created: false,
      email: adminEmail,
      password: null as string | null,
    };
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.log(
      `[Bootstrap] System admin '${adminEmail}' not found and ADMIN_PASSWORD is not set; skipping creation. ` +
        `Run 'tsx scripts/setup-system-admin.ts' to create it.`,
    );
    return {
      success: false,
      created: false,
      email: adminEmail,
      password: null as string | null,
    };
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      id: adminUserId,
      email: adminEmail,
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
      status: "active",
      isProfileComplete: true,
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    console.log(`[Bootstrap] Created system admin: ${adminUser.email}`);
    await ensureAdminRoles(db, adminUser.id);
  }

  return {
    success: true,
    created: !!adminUser,
    email: adminEmail,
    password: adminPassword,
  };
}
