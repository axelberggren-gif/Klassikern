-- Add race date columns to profiles for countdown feature
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS race_date_vr DATE,
  ADD COLUMN IF NOT EXISTS race_date_vansbro DATE,
  ADD COLUMN IF NOT EXISTS race_date_lidingo DATE,
  ADD COLUMN IF NOT EXISTS race_date_vasaloppet DATE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
