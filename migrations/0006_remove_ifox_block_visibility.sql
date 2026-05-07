-- Remove the leftover iFox block visibility row from system_settings.
-- The iFox home block is now always visible; the toggle UI and API were
-- removed in task #42, but the underlying setting row was intentionally
-- left behind. Nothing reads or writes it anymore, so drop it to keep
-- the settings table tidy.

DELETE FROM "system_settings" WHERE "key" = 'ifox_block_visibility';
