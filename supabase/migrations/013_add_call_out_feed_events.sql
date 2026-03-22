-- ============================================================================
-- 013: Add call-out feed event types
-- The call_out_created and call_out_won event types were missing from the
-- feed_event_type enum, causing challenge creation to fail when posting
-- the activity feed event.
-- ============================================================================

ALTER TYPE feed_event_type ADD VALUE IF NOT EXISTS 'call_out_created';
ALTER TYPE feed_event_type ADD VALUE IF NOT EXISTS 'call_out_won';

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
