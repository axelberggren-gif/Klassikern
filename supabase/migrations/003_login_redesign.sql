-- ============================================================================
-- Migration 003: Login Redesign
-- ============================================================================
-- Adds email to profiles, updates trigger, backfills existing users,
-- and adds anon SELECT policy for login page user picker.
-- ============================================================================

-- 1. Add email column to profiles
alter table profiles add column email text;

-- 2. Backfill email from auth.users for existing users
update public.profiles
set email = au.email
from auth.users au
where profiles.id = au.id
  and profiles.email is null;

-- 3. Update the trigger to include email when creating new users
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Allow anon role to read profiles (for login page user picker)
create policy profiles_select_anon_login
  on profiles for select
  to anon
  using (true);

-- 5. Add index on display_name for login queries
create index if not exists idx_profiles_display_name on profiles (display_name);
