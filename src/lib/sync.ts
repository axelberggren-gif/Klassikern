import { getPendingSessions, removePendingSession } from './pwa';
import { logSession } from './store';
import { createClient } from './supabase';
import type { Profile, SportType, EffortRating } from '@/types/database';

/**
 * Syncs pending offline sessions to Supabase.
 * Called when the app comes back online.
 * Returns the number of successfully synced sessions.
 */
export async function syncPendingSessions(): Promise<number> {
  const pending = await getPendingSessions();
  if (pending.length === 0) return 0;

  // Fetch current profile for EP calculation
  const supabase = createClient();
  let synced = 0;

  for (const entry of pending) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', entry.data.userId)
        .single();

      if (!profile) continue;

      const result = await logSession({
        userId: entry.data.userId,
        groupId: entry.data.groupId,
        currentProfile: profile as Profile,
        sportType: entry.data.sportType as SportType,
        durationMinutes: entry.data.durationMinutes,
        distanceKm: entry.data.distanceKm,
        effortRating: entry.data.effortRating as EffortRating,
        note: entry.data.note,
        plannedSessionId: entry.data.plannedSessionId,
      });

      if ('session' in result) {
        await removePendingSession(entry.id!);
        synced++;
      }
    } catch (err) {
      console.error('Failed to sync session:', err);
      // Leave in queue for next sync attempt
    }
  }

  return synced;
}
