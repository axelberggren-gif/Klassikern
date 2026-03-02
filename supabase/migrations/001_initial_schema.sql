-- ============================================================================
-- Klassikern Webapp - Initial Database Schema
-- ============================================================================
-- This migration creates all core tables for the Klassikern fitness tracking
-- app: profiles, groups, sessions, activity feed, badges, and training plans.
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

create type sport_type as enum (
  'cycling', 'running', 'swimming', 'hiit', 'rest', 'other'
);

create type effort_rating as enum ('1', '2', '3', '4', '5');

create type badge_category as enum ('sport', 'consistency', 'social', 'special');

create type feed_event_type as enum (
  'session_logged',
  'badge_earned',
  'streak_milestone',
  'waypoint_reached',
  'challenge_completed'
);

-- ============================================================================
-- HELPER FUNCTION: auto-update updated_at timestamp
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- HELPER FUNCTION: generate short invite codes
-- ============================================================================

create or replace function generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no I, O, 0, 1 to avoid confusion
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$ language plpgsql;

-- ============================================================================
-- TABLE: profiles
-- ============================================================================
-- Linked 1:1 to auth.users via id. Created automatically on signup via trigger.

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  avatar_url    text,

  -- Klassikern goal targets
  goal_vr_hours         numeric(5,1) not null default 9,     -- Vatternrundan target hours
  goal_vansbro_minutes  numeric(5,1) not null default 60,    -- Vansbrosimningen target minutes
  goal_lidingo_hours    numeric(5,1) not null default 3,     -- Lidingoloppet target hours

  -- Aggregated stats (denormalized for fast reads)
  total_ep              int not null default 0,
  current_streak        int not null default 0,
  longest_streak        int not null default 0,
  streak_freezes_remaining int not null default 1,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: groups
-- ============================================================================
-- Training groups that users can join via invite code.

create table groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique default generate_invite_code(),
  created_by   uuid references auth.users(id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger groups_updated_at
  before update on groups
  for each row execute function update_updated_at_column();

-- Index for fast invite code lookups
create index idx_groups_invite_code on groups (invite_code);

-- ============================================================================
-- TABLE: group_members
-- ============================================================================
-- Many-to-many relationship between users and groups.

create table group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at  timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (group_id, user_id)
);

create trigger group_members_updated_at
  before update on group_members
  for each row execute function update_updated_at_column();

create index idx_group_members_user_id on group_members (user_id);
create index idx_group_members_group_id on group_members (group_id);

-- ============================================================================
-- TABLE: planned_sessions
-- ============================================================================
-- Training plan entries. These are group-level templates that represent
-- the recommended training schedule.

create table planned_sessions (
  id                         uuid primary key default gen_random_uuid(),
  group_id                   uuid not null references groups(id) on delete cascade,
  week_number                int not null,
  day_of_week                int not null check (day_of_week between 1 and 7), -- 1=Monday, 7=Sunday
  date                       date not null,
  sport_type                 sport_type not null,
  title                      text not null,
  description                text,
  suggested_duration_minutes int,
  suggested_intensity        text,
  sort_order                 int not null default 0,

  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create trigger planned_sessions_updated_at
  before update on planned_sessions
  for each row execute function update_updated_at_column();

create index idx_planned_sessions_group_id on planned_sessions (group_id);
create index idx_planned_sessions_week on planned_sessions (group_id, week_number);
create index idx_planned_sessions_date on planned_sessions (group_id, date);

-- ============================================================================
-- TABLE: sessions
-- ============================================================================
-- Logged training sessions with EP calculation fields.

create table sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  planned_session_id  uuid references planned_sessions(id) on delete set null,
  sport_type          sport_type not null,
  date                date not null,
  duration_minutes    int not null check (duration_minutes > 0),
  distance_km         numeric(7,2),
  effort_rating       effort_rating not null,
  note                text,
  ep_earned           int not null default 0,
  is_bonus            boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at_column();

create index idx_sessions_user_id on sessions (user_id);
create index idx_sessions_user_date on sessions (user_id, date);
create index idx_sessions_planned on sessions (planned_session_id);

-- ============================================================================
-- TABLE: badges
-- ============================================================================
-- Badge definitions. Read-only reference data.

create table badges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null,
  icon_key    text not null,
  category    badge_category not null,
  sport_type  sport_type,  -- null if badge is not sport-specific

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger badges_updated_at
  before update on badges
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: user_badges
-- ============================================================================
-- Tracks which badges each user has earned.

create table user_badges (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, badge_id)
);

create trigger user_badges_updated_at
  before update on user_badges
  for each row execute function update_updated_at_column();

create index idx_user_badges_user_id on user_badges (user_id);

-- ============================================================================
-- TABLE: activity_feed
-- ============================================================================
-- Group activity feed items (session logged, badge earned, streak milestones, etc.)

create table activity_feed (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  feed_event_type not null,
  event_data  jsonb not null default '{}',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger activity_feed_updated_at
  before update on activity_feed
  for each row execute function update_updated_at_column();

create index idx_activity_feed_group_id on activity_feed (group_id, created_at desc);
create index idx_activity_feed_user_id on activity_feed (user_id);

-- ============================================================================
-- TABLE: feed_reactions
-- ============================================================================
-- Emoji reactions on activity feed items.

create table feed_reactions (
  id            uuid primary key default gen_random_uuid(),
  feed_item_id  uuid not null references activity_feed(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  emoji         text not null,

  created_at    timestamptz not null default now(),

  unique (feed_item_id, user_id, emoji)
);

create index idx_feed_reactions_feed_item on feed_reactions (feed_item_id);

-- ============================================================================
-- TABLE: weekly_challenges
-- ============================================================================
-- Group-level weekly challenges.

create table weekly_challenges (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references groups(id) on delete cascade,
  week_number      int not null,
  title            text not null,
  description      text not null,
  challenge_type   text not null,
  target_value     numeric(10,2) not null default 0,
  current_value    numeric(10,2) not null default 0,
  is_completed     boolean not null default false,
  started_at       timestamptz not null default now(),
  ends_at          timestamptz not null,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger weekly_challenges_updated_at
  before update on weekly_challenges
  for each row execute function update_updated_at_column();

create index idx_weekly_challenges_group_week on weekly_challenges (group_id, week_number);

-- ============================================================================
-- TABLE: expedition_waypoints
-- ============================================================================
-- Static reference data for the expedition map route.

create table expedition_waypoints (
  id           serial primary key,
  name         text not null,
  description  text not null,
  ep_threshold int not null,
  map_x        numeric(5,1) not null,
  map_y        numeric(5,1) not null,
  sort_order   int not null,

  created_at   timestamptz not null default now()
);

-- ============================================================================
-- TRIGGER: auto-create profile on new user signup
-- ============================================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- SEED: expedition waypoints (static reference data)
-- ============================================================================

insert into expedition_waypoints (name, description, ep_threshold, map_x, map_y, sort_order) values
  ('Start - Mora',                'Vasaloppet avklarat! Expeditionen borjar.',                  0, 50, 20, 1),
  ('Rattvik',                     'Genom Dalarna, forbi Siljan.',                              500, 55, 25, 2),
  ('Falun',                       'Kopparstadens charm.',                                     1000, 55, 30, 3),
  ('Gavle',                       'Kusten narmar sig!',                                       1500, 58, 35, 4),
  ('Uppsala',                     'Universitetsstadens torn.',                                2000, 58, 42, 5),
  ('Stockholm',                   'Huvudstaden! Halvvags pa resan.',                          2500, 62, 48, 6),
  ('Nykoping',                    'Soderut langs kusten.',                                    3000, 58, 55, 7),
  ('Linkoping',                   'Ostgotaslatten breder ut sig.',                            3500, 52, 58, 8),
  ('Vadstena',                    'Vid Vatterns strand!',                                     4000, 48, 57, 9),
  ('Motala - Vatternrundan!',     'Dags att cykla runt Vattern! 315 km.',                     4500, 48, 55, 10),
  ('Karlstad',                    'Vasterut mot Varmland.',                                   5000, 40, 48, 11),
  ('Vansbro - Simningen!',        'Hoppa i Vanan! 3 km.',                                     5500, 42, 35, 12),
  ('Borlange',                    'Tillbaka genom Dalarna.',                                  6000, 50, 32, 13),
  ('Vasteras',                    'Malardalens parla.',                                       6500, 55, 40, 14),
  ('Lidingo - Loppet!',           'Sista racet! 30 km terranglopning. Du ar en Klassiker!',   7000, 63, 47, 15);
