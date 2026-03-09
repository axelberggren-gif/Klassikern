-- 008_strava_enhancements.sql
-- Add athlete_name and last_synced_at to strava_connections

ALTER TABLE strava_connections
  ADD COLUMN IF NOT EXISTS athlete_name text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
