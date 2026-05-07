-- Drop Mirqab and Gulf Events feature tables, plus stale RBAC rows.
-- Order matters: drop child tables before parents to satisfy FK constraints.

-- 1. Drop feature tables
DROP TABLE IF EXISTS "gulf_event_logs" CASCADE;
DROP TABLE IF EXISTS "gulf_events" CASCADE;

DROP TABLE IF EXISTS "mirqab_sabq_index" CASCADE;
DROP TABLE IF EXISTS "mirqab_next_story" CASCADE;
DROP TABLE IF EXISTS "mirqab_radar_alerts" CASCADE;
DROP TABLE IF EXISTS "mirqab_algorithm_articles" CASCADE;
DROP TABLE IF EXISTS "mirqab_entries" CASCADE;

-- 2. Clean stale RBAC rows for removed Mirqab permission codes.
--    role_permissions has ON DELETE CASCADE on permission_id, so
--    deleting permissions also removes mappings, but we delete
--    role_permissions first explicitly for clarity / forward-compat.
DELETE FROM "role_permissions"
WHERE "permission_id" IN (
  SELECT "id" FROM "permissions"
  WHERE "code" IN (
    'mirqab.view',
    'mirqab.create',
    'mirqab.edit',
    'mirqab.delete',
    'mirqab.publish',
    'mirqab.manage_settings'
  )
);

DELETE FROM "permissions"
WHERE "code" IN (
  'mirqab.view',
  'mirqab.create',
  'mirqab.edit',
  'mirqab.delete',
  'mirqab.publish',
  'mirqab.manage_settings'
);
