-- ============================================================================
-- Strava Badge
-- ============================================================================
-- Adds the "Strava Kopplad" achievement badge awarded when a user connects
-- their Strava account for the first time.
-- ============================================================================

INSERT INTO badges (name, description, icon_key, category, sport_type)
VALUES (
  'Strava Kopplad',
  'Koppla ditt Strava-konto och importera träningspass automatiskt.',
  'activity',
  'special',
  NULL
);

NOTIFY pgrst, 'reload schema';
