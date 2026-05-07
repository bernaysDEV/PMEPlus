// RBAC (Role-Based Access Control) middleware and utilities
import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, roles, permissions, rolePermissions, userRoles, userPermissionOverrides } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { memoryCache, CACHE_TTL } from "./memoryCache";
import { PERMISSION_CODES } from "@shared/rbac-constants";

// Type definitions
export type PermissionCode = string; // e.g., "articles.create"

// Roles that should be treated as full superusers and granted every permission
// implicitly. Mirrors the list used in `userHasPermission` and the frontend
// permission payload in routes.ts so all permission checks stay consistent.
const SUPERUSER_ROLE_NAMES = [
  "admin",
  "superadmin",
  "super_admin",
  "system_admin",
  "system.admin",
];

// Internal: detect whether a user has any superuser role, either via the
// legacy `users.role` column or via assigned RBAC roles.
async function isSuperuserById(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user && SUPERUSER_ROLE_NAMES.includes(user.role)) {
    return true;
  }

  const rbacRoles = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return rbacRoles.some((r) => SUPERUSER_ROLE_NAMES.includes(r.roleName));
}

// Check if a user has a specific permission using cached permissions
// Supports user-level permission overrides for fine-grained control.
//
// Superusers are granted *every* permission implicitly, regardless of whether
// the requested code happens to appear in the `PERMISSION_CODES` enum or in
// the materialised permission list — explicit deny overrides are still
// honoured. This guarantees that any future drift between DB-registered
// permission codes and the constants file can never lock an admin out of a
// route protected by `requirePermission(...)`.
export async function userHasPermission(
  userId: string,
  permissionCode: PermissionCode
): Promise<boolean> {
  try {
    const cacheKey = `rbac:${userId}`;
    let permData = memoryCache.get<{ isSuperuser: boolean; permissions: string[]; deniedOverrides: string[] }>(cacheKey);

    if (!permData) {
      const isSuperuser = await isSuperuserById(userId);
      // Always materialise the full effective permission list (including
      // for superusers) so deny overrides are honoured consistently with
      // `getUserPermissions`.
      const permissions = await getUserPermissions(userId);
      const overrides = await db
        .select({
          permissionCode: userPermissionOverrides.permissionCode,
          effect: userPermissionOverrides.effect,
        })
        .from(userPermissionOverrides)
        .where(eq(userPermissionOverrides.userId, userId));
      const deniedOverrides = overrides
        .filter((o) => o.effect === "deny")
        .map((o) => o.permissionCode);
      permData = { isSuperuser, permissions, deniedOverrides };
      memoryCache.set(cacheKey, permData, 2 * 60 * 1000); // 2 min cache
    }

    if (permData.isSuperuser) {
      // Honour explicit deny overrides even for superusers.
      return !permData.deniedOverrides.includes(permissionCode);
    }

    return permData.permissions.includes(permissionCode);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

// Get all permissions for a user using efficient JOIN
// Includes user-level overrides for complete permission set.
// For superuser roles (admin/superadmin/system_admin/system.admin) the union
// of (a) the full PERMISSION_CODES catalogue and (b) every permission code
// currently registered in the DB is returned, so downstream `includes(...)`
// checks in route handlers do not falsely deny access just because no
// explicit role->permission rows are seeded for that role *or* a permission
// code exists in the DB but not yet in the constants file.
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    // Superuser roles get every known permission implicitly.
    if (await isSuperuserById(userId)) {
      const allCodes = new Set<string>(Object.values(PERMISSION_CODES));

      // Also include any permission codes registered in the DB that are not
      // (yet) reflected in the constants file. This keeps the superuser
      // bypass robust against drift between the DB and the shared enum.
      try {
        const dbPermissions = await db
          .select({ code: permissions.code })
          .from(permissions);
        for (const p of dbPermissions) {
          allCodes.add(p.code);
        }
      } catch (err) {
        // Non-fatal — we still return the constants-derived set.
        console.warn("[RBAC] Could not enumerate DB permissions for superuser:", err);
      }

      // Still apply explicit deny overrides so admins can intentionally
      // revoke a specific permission from a superuser if needed.
      const overrides = await db
        .select({
          permissionCode: userPermissionOverrides.permissionCode,
          effect: userPermissionOverrides.effect,
        })
        .from(userPermissionOverrides)
        .where(eq(userPermissionOverrides.userId, userId));

      for (const override of overrides) {
        if (override.effect === 'deny') {
          allCodes.delete(override.permissionCode);
        } else if (override.effect === 'allow') {
          allCodes.add(override.permissionCode);
        }
      }

      return Array.from(allCodes);
    }

    // Get role-based permissions
    const result = await db
      .select({ permissionCode: permissions.code })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    const rolePermissionCodes = new Set(result.map(r => r.permissionCode));

    // Get user-level overrides
    const overrides = await db
      .select({ 
        permissionCode: userPermissionOverrides.permissionCode,
        effect: userPermissionOverrides.effect 
      })
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));

    // Apply overrides
    for (const override of overrides) {
      if (override.effect === 'allow') {
        rolePermissionCodes.add(override.permissionCode);
      } else if (override.effect === 'deny') {
        rolePermissionCodes.delete(override.permissionCode);
      }
    }

    return Array.from(rolePermissionCodes);
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

// Get user permission overrides for display in UI
export async function getUserPermissionOverrides(userId: string): Promise<Array<{permissionCode: string, effect: string, reason?: string | null}>> {
  try {
    const overrides = await db
      .select({ 
        permissionCode: userPermissionOverrides.permissionCode,
        effect: userPermissionOverrides.effect,
        reason: userPermissionOverrides.reason
      })
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));

    return overrides;
  } catch (error) {
    console.error("Error getting user permission overrides:", error);
    return [];
  }
}

// Invalidate cached permission data for a user
// Call this when roles/permissions change
export function invalidateUserPermissionCache(userId: string): void {
  const cacheKey = `rbac:${userId}`;
  memoryCache.delete(cacheKey);
}

// Middleware: Require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware: Require specific permission
export function requirePermission(permissionCode: PermissionCode) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasPermission = await userHasPermission(userId, permissionCode);

    if (!hasPermission) {
      console.error(`[RBAC] Access denied - user ${userEmail} (${userId}): missing ${permissionCode}`);
      return res.status(403).json({ 
        message: "لا توجد لديك صلاحيات للوصول إلى هذه الخدمة",
        messageEn: "You don't have permission to access this service",
        required: permissionCode 
      });
    }

    next();
  };
}

// Middleware: Require one of multiple permissions (OR logic)
export function requireAnyPermission(...permissionCodes: PermissionCode[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user has any of the required permissions
    const checks = await Promise.all(
      permissionCodes.map(code => userHasPermission(userId, code))
    );

    const hasAnyPermission = checks.some(result => result === true);

    if (!hasAnyPermission) {
      return res.status(403).json({ 
        message: "لا توجد لديك صلاحيات للوصول إلى هذه الخدمة",
        messageEn: "You don't have permission to access this service",
        required: permissionCodes 
      });
    }

    next();
  };
}

// Middleware: Require all permissions (AND logic)
export function requireAllPermissions(...permissionCodes: PermissionCode[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if user has all required permissions
    const checks = await Promise.all(
      permissionCodes.map(code => userHasPermission(userId, code))
    );

    const hasAllPermissions = checks.every(result => result === true);

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        message: "لا توجد لديك صلاحيات للوصول إلى هذه الخدمة",
        messageEn: "You don't have permission to access this service",
        required: permissionCodes 
      });
    }

    next();
  };
}

// Middleware: Require specific role(s)
export function requireRole(...roleNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const cacheKey = `rbac:${userId}`;
    let cachedData = memoryCache.get<{ isSuperuser: boolean; permissions: string[]; roles: string[] }>(cacheKey);

    let userRoleNames: string[] = [];

    if (cachedData && cachedData.roles) {
      userRoleNames = cachedData.roles;
    } else {
      // Get user's roles from RBAC system
      const userRolesResult = await db
        .select({ roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      userRoleNames = userRolesResult.map(r => r.roleName);

      // Fallback: Check user.role from users table if no RBAC roles
      if (userRoleNames.length === 0) {
        const { users } = await import("@shared/schema");
        const [user] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (user?.role) {
          userRoleNames.push(user.role);
        }
      }

      // Update cache with roles
      if (cachedData) {
        cachedData.roles = userRoleNames;
        memoryCache.set(cacheKey, cachedData, 2 * 60 * 1000);
      }
    }

    // Check if user has any of the required roles
    const hasRole = roleNames.some(roleName => userRoleNames.includes(roleName));

    if (!hasRole) {
      console.error(`[RBAC] Access denied - user roles: ${userRoleNames.join(', ')}, required: ${roleNames.join(', ')}`);
      return res.status(403).json({ 
        message: "لا توجد لديك صلاحيات للوصول إلى هذه الخدمة",
        messageEn: "You don't have permission to access this service",
        required: roleNames,
        userHas: userRoleNames
      });
    }

    next();
  };
}

// Helper: Log activity to activity_logs table
export async function logActivity(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    reason?: string;
  };
}) {
  const { activityLogs } = await import("@shared/schema");
  
  try {
    await db.insert(activityLogs).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
      metadata: params.metadata || null,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
