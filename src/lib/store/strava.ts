import { createClient } from '@/lib/supabase';
import type { StravaConnection } from '@/types/database';

// ---------------------------------------------------------------------------
// Strava connection
// ---------------------------------------------------------------------------

export async function getStravaConnection(
  userId: string
): Promise<StravaConnection | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching Strava connection:', error);
    return null;
  }
  return data;
}

export async function disconnectStrava(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('strava_connections')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error disconnecting Strava:', error);
    return false;
  }
  return true;
}
