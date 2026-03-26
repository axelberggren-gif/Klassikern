import { createClient } from '@/lib/supabase';
import { calculateEP } from '../ep-calculator';
import { checkAndAwardBadges } from '../badge-checker';
import { detectPersonalRecords, type PersonalRecord } from '../pr-checker';
import type { Session, Profile, SportType, EffortRating } from '@/types/database';

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function getUserSessions(userId: string): Promise<Session[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  return data ?? [];
}

export interface LogSessionResult {
  session: Session;
  newBadges: string[];
  personalRecords: PersonalRecord[];
}

export async function logSession(params: {
  userId: string;
  groupId: string | null;
  currentProfile: Profile;
  sportType: SportType;
  durationMinutes: number;
  distanceKm: number | null;
  effortRating: EffortRating;
  note: string;
  plannedSessionId: string | null;
}): Promise<LogSessionResult | null> {
  const supabase = createClient();

  const ep = calculateEP(
    params.sportType,
    params.durationMinutes,
    params.effortRating,
    params.currentProfile.current_streak
  );

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: params.userId,
      planned_session_id: params.plannedSessionId,
      sport_type: params.sportType,
      date: new Date().toISOString().split('T')[0],
      duration_minutes: params.durationMinutes,
      distance_km: params.distanceKm,
      effort_rating: params.effortRating,
      note: params.note || null,
      ep_earned: ep,
      is_bonus: !params.plannedSessionId,
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Error logging session:', sessionError);
    return null;
  }

  const newStreak = params.currentProfile.current_streak + 1;
  await supabase
    .from('profiles')
    .update({
      total_ep: params.currentProfile.total_ep + ep,
      current_streak: newStreak,
      longest_streak: Math.max(
        params.currentProfile.longest_streak,
        newStreak
      ),
    })
    .eq('id', params.userId);

  if (params.groupId) {
    await supabase.from('activity_feed').insert({
      group_id: params.groupId,
      user_id: params.userId,
      event_type: 'session_logged',
      event_data: {
        sport_type: params.sportType,
        duration: params.durationMinutes,
        ep,
        note: params.note || null,
      },
    });
  }

  const newBadges = await checkAndAwardBadges(params.userId);

  // Check for personal records
  const previousSessions = await getUserSessions(params.userId);
  const personalRecords = detectPersonalRecords(session, previousSessions);

  return { session, newBadges, personalRecords };
}
