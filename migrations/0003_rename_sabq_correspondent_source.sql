-- Migration: Rename gulf_events.source_type "sabq_correspondent" to neutral "staff_correspondent"
-- Reason: Brand migration from Sabq to Property Middle East ME. The legacy value is
-- replaced with a brand-neutral identifier. Existing rows are backfilled in place.
--
-- Note: gulf_events.source_type is stored as TEXT (no Postgres ENUM type and no CHECK
-- constraint) — see shared/schema.ts gulfEvents table. Therefore no ALTER TYPE / ALTER
-- TABLE on a constraint is required; a value-level UPDATE is sufficient. Application-
-- level validation against the gulfEventSource constant still accepts the new value.

UPDATE gulf_events
SET source_type = 'staff_correspondent'
WHERE source_type = 'sabq_correspondent';
