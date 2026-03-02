-- ============================================================================
-- Klassikern Webapp - Seed Badge Definitions
-- ============================================================================
-- Populates the badges table with the initial set of achievements.
-- Categories: consistency, sport, special
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Consistency badges
-- ---------------------------------------------------------------------------

INSERT INTO badges (name, description, icon_key, category, sport_type) VALUES
  ('Första passet',     'Logga ditt allra första träningspass.',            'star',   'consistency', NULL),
  ('7-dagars streak',   'Träna 7 dagar i rad utan avbrott.',               'flame',  'consistency', NULL),
  ('30-dagars streak',  'Träna 30 dagar i rad — otroligt!',                'flame',  'consistency', NULL),
  ('100 EP',            'Nå 100 EP totalt.',                               'zap',    'consistency', NULL),
  ('500 EP',            'Nå 500 EP totalt.',                               'zap',    'consistency', NULL),
  ('1000 EP',           'Nå 1000 EP totalt — du är en maskin!',            'crown',  'consistency', NULL);

-- ---------------------------------------------------------------------------
-- Sport badges
-- ---------------------------------------------------------------------------

INSERT INTO badges (name, description, icon_key, category, sport_type) VALUES
  ('Cykelkung',         'Logga 10 cykelpass.',                             'bike',              'sport', 'cycling'),
  ('Löparlegend',       'Logga 10 löppass.',                               'person-standing',   'sport', 'running'),
  ('Simmare',           'Logga 10 simpass.',                               'waves',             'sport', 'swimming');

-- ---------------------------------------------------------------------------
-- Special badges
-- ---------------------------------------------------------------------------

INSERT INTO badges (name, description, icon_key, category, sport_type) VALUES
  ('Klassiker Komplett', 'Logga minst ett pass av varje Klassiker-gren: cykling, löpning, simning och skidåkning.', 'trophy', 'special', NULL);
