-- ============================================================================
-- Strava Integration - Connections & Activity Tracking
-- ============================================================================
-- Adds support for connecting Strava accounts to import training activities.
-- ============================================================================

-- Strava connection: stores OAuth tokens per user
create table strava_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on strava_connections
create trigger strava_connections_updated_at
  before update on strava_connections
  for each row execute function update_updated_at_column();

-- Indexes for efficient lookups
create index idx_strava_connections_user_id on strava_connections (user_id);
create index idx_strava_connections_athlete_id on strava_connections (strava_athlete_id);

-- Add strava_activity_id to sessions to prevent duplicate imports
alter table sessions add column strava_activity_id bigint unique;

-- RLS policies for strava_connections
alter table strava_connections enable row level security;

create policy "Users can read their own strava connection"
  on strava_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own strava connection"
  on strava_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own strava connection"
  on strava_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete their own strava connection"
  on strava_connections for delete
  using (auth.uid() = user_id);
