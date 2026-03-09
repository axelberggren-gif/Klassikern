import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types/database';

// ---------------------------------------------------------------------------
// Login (anon-accessible)
// ---------------------------------------------------------------------------

export type LoginProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
};

export async function getLoginProfiles(): Promise<LoginProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_login_profiles');

  if (error) {
    console.error('Error fetching login profiles:', error);
    return [];
  }
  return (data ?? []) as LoginProfile[];
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateCurrentUser(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }
  return data;
}
