-- Task #30: Remove Urdu (ur) language entirely — bilingual ar/en only.
-- Drops Urdu-specific content tables and the urdu_count column from
-- email_agent_stats. There were no rows with language='ur' in any
-- shared language/locale columns at the time of cleanup, so no
-- DELETE/UPDATE statements are required.

DROP TABLE IF EXISTS "ur_smart_blocks" CASCADE;
DROP TABLE IF EXISTS "ur_reading_history" CASCADE;
DROP TABLE IF EXISTS "ur_reactions" CASCADE;
DROP TABLE IF EXISTS "ur_quad_categories_settings" CASCADE;
DROP TABLE IF EXISTS "ur_comments" CASCADE;
DROP TABLE IF EXISTS "ur_bookmarks" CASCADE;
DROP TABLE IF EXISTS "ur_articles" CASCADE;
DROP TABLE IF EXISTS "ur_categories" CASCADE;

ALTER TABLE "email_agent_stats" DROP COLUMN IF EXISTS "urdu_count";
