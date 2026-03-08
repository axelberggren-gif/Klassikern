-- ============================================================================
-- RPC function: get_login_profiles
-- ============================================================================
-- Returns profiles with email addresses for the login user picker.
-- Uses SECURITY DEFINER to bypass RLS (login page has no authenticated user).
-- Joins with auth.users to get the email column (not stored on profiles).

create or replace function get_login_profiles()
returns table (id uuid, display_name text, avatar_url text, email text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url, u.email::text
  from profiles p
  join auth.users u on u.id = p.id
  where p.display_name != ''
  order by p.display_name;
$$;
