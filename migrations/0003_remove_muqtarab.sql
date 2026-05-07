-- Drop Muqtarab feature tables and remove related section row.
-- Order matters: drop child tables before parents to satisfy FK constraints.

DROP TABLE IF EXISTS "topics" CASCADE;
DROP TABLE IF EXISTS "article_angles" CASCADE;
DROP TABLE IF EXISTS "angle_submissions" CASCADE;
DROP TABLE IF EXISTS "angles" CASCADE;

DELETE FROM "sections" WHERE "slug" = 'muqtarab';
