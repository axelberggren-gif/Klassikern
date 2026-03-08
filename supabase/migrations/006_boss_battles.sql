-- ============================================================================
-- Boss Battle System - Database Migration
-- ============================================================================
-- Adds boss battle tables for weekly group bosses based on Nordic mythology.
-- Bosses have HP that decreases with each logged session (based on EP).
-- ============================================================================

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

create type boss_encounter_status as enum (
  'active',     -- currently fighting this boss
  'defeated',   -- group killed the boss
  'failed',     -- week ended without defeating
  'upcoming'    -- scheduled but not yet started
);

-- Add boss-related feed event types
alter type feed_event_type add value 'boss_attacked';
alter type feed_event_type add value 'boss_defeated';
alter type feed_event_type add value 'boss_failed';
alter type feed_event_type add value 'boss_critical_hit';

-- ============================================================================
-- TABLE: boss_definitions
-- ============================================================================
-- Static reference data: all 30 Nordic mythology bosses with stats.
-- Bosses are ordered by level (1-30) with scaling HP.

create table boss_definitions (
  id          serial primary key,
  name        text not null,
  emoji       text not null,
  lore        text not null,
  level       int not null unique check (level between 1 and 30),
  base_hp     int not null check (base_hp > 0),
  weakness    sport_type,    -- takes 1.5x damage from this sport
  resistance  sport_type,    -- takes 0.75x damage from this sport

  created_at  timestamptz not null default now()
);

-- ============================================================================
-- TABLE: boss_encounters
-- ============================================================================
-- A group's weekly boss encounter. One active encounter per group at a time.

create table boss_encounters (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  boss_id     int not null references boss_definitions(id) on delete restrict,
  status      boss_encounter_status not null default 'active',
  max_hp      int not null check (max_hp > 0),
  current_hp  int not null,
  week_start  date not null,       -- Monday of the encounter week
  week_end    date not null,       -- Sunday of the encounter week
  defeated_at timestamptz,
  defeated_by uuid references auth.users(id) on delete set null,  -- killing blow

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Only one active encounter per group
  unique (group_id, week_start)
);

create trigger boss_encounters_updated_at
  before update on boss_encounters
  for each row execute function update_updated_at_column();

create index idx_boss_encounters_group_id on boss_encounters (group_id, status);
create index idx_boss_encounters_active on boss_encounters (group_id) where status = 'active';
create index idx_boss_encounters_week on boss_encounters (week_start, week_end);

-- ============================================================================
-- TABLE: boss_attacks
-- ============================================================================
-- Individual attacks (damage dealt) on a boss from a training session.

create table boss_attacks (
  id            uuid primary key default gen_random_uuid(),
  encounter_id  uuid not null references boss_encounters(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid not null references sessions(id) on delete cascade,
  damage        int not null check (damage > 0),
  is_critical   boolean not null default false,
  sport_type    sport_type not null,

  created_at    timestamptz not null default now()
);

create index idx_boss_attacks_encounter on boss_attacks (encounter_id);
create index idx_boss_attacks_user on boss_attacks (user_id);
create index idx_boss_attacks_session on boss_attacks (session_id);

-- ============================================================================
-- TABLE: boss_trophies
-- ============================================================================
-- Trophies earned by users for defeating bosses.

create table boss_trophies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  encounter_id  uuid not null references boss_encounters(id) on delete cascade,
  boss_id       int not null references boss_definitions(id) on delete restrict,
  bonus_ep      int not null default 0,
  is_killing_blow boolean not null default false,

  created_at    timestamptz not null default now(),

  unique (user_id, encounter_id)
);

create index idx_boss_trophies_user on boss_trophies (user_id);

-- ============================================================================
-- SEED: boss_definitions (30 Nordic mythology bosses)
-- ============================================================================
-- Progression from level 1 (Fenrisulven) to level 30 (Ragnarök).
-- HP scales from 200 to 6000. Each boss has a weakness and resistance.

insert into boss_definitions (name, emoji, lore, level, base_hp, weakness, resistance) values
  -- Tier 1: Skogsväsen (Forest creatures) - Levels 1-5
  ('Skogsrået',    '🌲', 'En förförisk skogsande som lockar vandrare djupt in bland träden.',                    1,  200,  'running',  'swimming'),
  ('Näcken',       '🎻', 'En vattenande som spelar oemotståndlig fiolmusik vid forsande vatten.',                 2,  300,  'swimming', 'cycling'),
  ('Mylingen',     '👻', 'Rastlösa andar av odöpta barn som jagar vandrare genom dimman.',                        3,  400,  'cycling',  'running'),
  ('Vittra',       '🏔️', 'Underjordiska väsen som vaktar dolda skatter i bergens djup.',                          4,  500,  'hiit',     'swimming'),
  ('Bäckahästen',  '🐴', 'En magisk häst som lockar ryttare ner i vattendjupet.',                                5,  650,  'swimming', 'hiit'),

  -- Tier 2: Troll & Jättar (Trolls & Giants) - Levels 6-10
  ('Bergatrollet', '🪨', 'Ett enormt troll som slår vakt om bergspassen med sin stenklubba.',                     6,  800,  'running',  'hiit'),
  ('Rimtussen',    '❄️', 'En frostjätte vars andedräkt förvandlar allt till is.',                                  7,  950,  'hiit',     'cycling'),
  ('Huldran',      '🌿', 'En skogsnymf med ihålig rygg som förvillar ensamma resenärer.',                         8, 1100,  'cycling',  'running'),
  ('Draugen',      '⛵', 'En odöd sjöman som seglar ett halvt skepp genom stormiga hav.',                         9, 1300,  'swimming', 'running'),
  ('Storjätten',   '⛰️', 'En uråldrig jätte så stor att berg bildas där hen vilar.',                              10, 1500, 'hiit',     'swimming'),

  -- Tier 3: Mytiska Odjur (Mythical Beasts) - Levels 11-15
  ('Lindormen',    '🐉', 'En vingad orm som terroriserar byar från sitt näste i bergen.',                         11, 1700, 'running',  'cycling'),
  ('Fenrisulven',  '🐺', 'Den gigantiska vargen bunden av gudarna, vars vrål skakar världen.',                    12, 1900, 'cycling',  'hiit'),
  ('Nidhogg',      '🐲', 'Draken som gnager på världsträdets rötter i underjorden.',                              13, 2100, 'swimming', 'running'),
  ('Sleipner',     '🦄', 'Odins åttabenta häst som galopperar mellan världarna.',                                14, 2300, 'hiit',     'cycling'),
  ('Kraken',       '🦑', 'Det kolossala havsmonster som drar hela skepp ner i djupet.',                          15, 2500, 'swimming', 'hiit'),

  -- Tier 4: Gudarnas Fiender (Enemies of the Gods) - Levels 16-20
  ('Surt',         '🔥', 'Eldvärldens härskare som bär ett flammande svärd.',                                    16, 2800, 'swimming', 'cycling'),
  ('Hel',          '💀', 'Dödsrikets drottning, halv levande och halv skelett.',                                  17, 3100, 'cycling',  'swimming'),
  ('Garm',         '🐕', 'Den blodiga vakthunden vid Hels portar.',                                              18, 3400, 'running',  'hiit'),
  ('Hrym',         '🚢', 'Jättarnas kapten som styr Naglfar, skeppet byggt av dödas naglar.',                    19, 3700, 'hiit',     'running'),
  ('Jörmungandr',  '🌊', 'Midgårdsormen som omsluter hela jorden i havsdjupet.',                                 20, 4000, 'swimming', 'cycling'),

  -- Tier 5: Ragnarök-Strider (Ragnarök Battles) - Levels 21-25
  ('Skoll',        '🌑', 'Vargen som jagar solen över himlavalvet.',                                             21, 4300, 'running',  'swimming'),
  ('Hati',         '🌕', 'Vargen som jagar månen genom natten.',                                                 22, 4600, 'cycling',  'running'),
  ('Surts Armé',   '🔥', 'En armé av eldjättar som marscherar från Muspelheim.',                                 23, 4900, 'swimming', 'hiit'),
  ('Loke',         '🃏', 'Tricksterguden som leder kaoskrafterna mot Asgård.',                                   24, 5200, 'hiit',     'cycling'),
  ('Naglfar',      '⛵', 'Dödsskeppet av naglar, lastat med Hels krigare.',                                      25, 5500, 'cycling',  'swimming'),

  -- Tier 6: Ragnarök (Final Battles) - Levels 26-30
  ('Fenrir Lös',      '🐺', 'Fenrisulven bryter sina bojor och slukar himmel och jord.',                          26, 5700, 'running',  'hiit'),
  ('Jörmungandrs Vrede', '🌊', 'Midgårdsormen reser sig ur havet och förgiftar himlen.',                          27, 5900, 'swimming', 'running'),
  ('Surts Eld',       '☄️', 'Surt svingar sitt eldiga svärd och sätter världen i brand.',                         28, 6100, 'hiit',     'swimming'),
  ('Ragnarök',        '⚡', 'Gudaskymningen! Alla krafter möts i den sista striden.',                             29, 6300, 'cycling',  'running'),
  ('Yggdrasils Pånyttfödelse', '🌳', 'Världsträdet pånyttföds. Slå det sista slaget för en ny värld.',           30, 6500, 'running',  'cycling');
