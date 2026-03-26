-- 016: Add race date fields for Klassiker countdown cards
-- Users can customize race day targets in profile settings.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS race_date_vattern date NOT NULL DEFAULT '2026-06-13',
ADD COLUMN IF NOT EXISTS race_date_vansbro date NOT NULL DEFAULT '2026-07-04',
ADD COLUMN IF NOT EXISTS race_date_lidingo date NOT NULL DEFAULT '2026-09-26',
ADD COLUMN IF NOT EXISTS race_date_vasaloppet date NOT NULL DEFAULT '2027-03-07';

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload schema';
