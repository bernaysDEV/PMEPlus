/**
 * Import the full RBAC dataset (permissions + roles + role_permissions)
 * exported from the Sabq project into this database.
 *
 * Behaviour:
 *  - permissions: UPSERT by `code` (existing rows updated, new rows inserted,
 *                 nothing deleted).
 *  - roles:       UPSERT by `name` (existing rows updated, new rows inserted,
 *                 nothing deleted).
 *  - role_permissions: REPLACE the set per role listed in the import file.
 *                 If a role has the wildcard "*" entry, it gets every
 *                 permission currently in the `permissions` table.
 *                 Roles not listed in the import file are left untouched.
 *
 * Usage:
 *   tsx scripts/import-rbac.ts
 *   tsx scripts/import-rbac.ts path/to/rbac-export.json
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql, eq, inArray } from "drizzle-orm";
import ws from "ws";
import fs from "node:fs";
import path from "node:path";

import * as schema from "../shared/schema.js";

neonConfig.webSocketConstructor = ws;

interface PermissionEntry {
  code: string;
  label: string;
  labelAr: string;
  module: string;
  description?: string | null;
}

interface RoleEntry {
  name: string;
  nameAr: string;
  description?: string | null;
  isSystem?: boolean;
}

interface RbacExport {
  permissions: PermissionEntry[];
  roles: RoleEntry[];
  rolePermissions: Record<string, string[]>;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const inputPath = process.argv[2] ?? "scripts/data/rbac-export.json";
  const absPath = path.resolve(inputPath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(absPath, "utf8");
  const data = JSON.parse(raw) as RbacExport;

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    console.log(`Importing RBAC from ${inputPath}`);
    console.log(
      `  permissions: ${data.permissions.length}, roles: ${data.roles.length}, rolePermissions: ${Object.keys(data.rolePermissions).length}`,
    );

    // 1) Permissions upsert
    let pInserted = 0;
    let pUpdated = 0;
    for (const p of data.permissions) {
      const result = await db.execute(sql`
        INSERT INTO permissions (code, label, label_ar, module, description)
        VALUES (${p.code}, ${p.label}, ${p.labelAr}, ${p.module}, ${p.description ?? null})
        ON CONFLICT (code) DO UPDATE SET
          label = EXCLUDED.label,
          label_ar = EXCLUDED.label_ar,
          module = EXCLUDED.module,
          description = EXCLUDED.description
        RETURNING (xmax = 0) AS inserted
      `);
      const row = (result as any).rows?.[0];
      if (row?.inserted) pInserted++;
      else pUpdated++;
    }
    console.log(`  permissions: inserted=${pInserted} updated=${pUpdated}`);

    // 2) Roles upsert
    let rInserted = 0;
    let rUpdated = 0;
    for (const r of data.roles) {
      const result = await db.execute(sql`
        INSERT INTO roles (name, name_ar, description, is_system)
        VALUES (${r.name}, ${r.nameAr}, ${r.description ?? null}, ${r.isSystem ?? false})
        ON CONFLICT (name) DO UPDATE SET
          name_ar = EXCLUDED.name_ar,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `);
      const row = (result as any).rows?.[0];
      if (row?.inserted) rInserted++;
      else rUpdated++;
    }
    console.log(`  roles: inserted=${rInserted} updated=${rUpdated}`);

    // 3) Build lookup tables
    const allPerms = await db.select().from(schema.permissions);
    const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));
    const allPermIds = allPerms.map((p) => p.id);

    const allRoles = await db.select().from(schema.roles);
    const roleByName = new Map(allRoles.map((r) => [r.name, r.id]));

    // 4) Role permissions REPLACE per listed role
    const summary: Array<{ role: string; total: number; missing: string[] }> =
      [];
    for (const [roleName, codes] of Object.entries(data.rolePermissions)) {
      const roleId = roleByName.get(roleName);
      if (!roleId) {
        summary.push({
          role: roleName,
          total: 0,
          missing: ["(role not found)"],
        });
        continue;
      }

      let permIds: string[];
      const missing: string[] = [];
      if (codes.length === 1 && codes[0] === "*") {
        permIds = [...allPermIds];
      } else {
        permIds = [];
        for (const code of codes) {
          const id = permByCode.get(code);
          if (id) permIds.push(id);
          else missing.push(code);
        }
      }

      // Replace: delete existing, insert new
      await db
        .delete(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, roleId));
      if (permIds.length > 0) {
        const rows = permIds.map((permissionId) => ({
          roleId,
          permissionId,
        }));
        // Insert in chunks to avoid parameter limits
        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
          await db.insert(schema.rolePermissions).values(rows.slice(i, i + chunkSize));
        }
      }
      summary.push({ role: roleName, total: permIds.length, missing });
    }

    console.log("\n========== ROLE PERMISSIONS ==========");
    for (const s of summary) {
      const miss = s.missing.length
        ? `   missing: ${s.missing.join(", ")}`
        : "";
      console.log(`  ${s.role.padEnd(22)} ${String(s.total).padStart(4)} perms${miss}`);
    }

    const finalPermsCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM permissions`,
    );
    const finalRolesCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM roles`,
    );
    const finalRpCount = await db.execute(
      sql`SELECT COUNT(*)::int AS c FROM role_permissions`,
    );
    console.log(
      `\nFinal counts: permissions=${(finalPermsCount as any).rows[0].c} roles=${(finalRolesCount as any).rows[0].c} role_permissions=${(finalRpCount as any).rows[0].c}`,
    );
    console.log("Done.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
