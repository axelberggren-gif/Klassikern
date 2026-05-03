import { createClient } from '@/lib/supabase';
import { calculateEP } from '../ep-calculator';
import { checkAndAwardBadges } from '../badge-checker';
import { notify } from '../notifications';
import { SPORT_CONFIG } from '../sport-config';
import { detectPersonalRecords, type PersonalRecord } from '../pr-checker';
import type { Session, Profile, SportType, EffortRating, NotificationPreferences } from '@/types/database';

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

export interface LogSessionError {
  error: string;
}

export type LogSessionOutcome = LogSessionResult | LogSessionError;

export async function uploadSessionPhoto(
  userId: string,
  file: File
): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('session-photos')
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error('Error uploading photo:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('session-photos')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function uploadSessionPhotos(
  userId: string,
  files: File[]
): Promise<string[]> {
  const results = await Promise.all(
    files.map((file) => uploadSessionPhoto(userId, file))
  );
  return results.filter((url): url is string => url !== null);
}

export async function uploadRaceIcon(
  userId: string,
  file: File
): Promise<string | null> {
  const supabase = createClient();
  const path = `${userId}/icon.png`;

  const { error } = await supabase.storage
    .from('race-icons')
    .upload(path, file, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    console.error('Error uploading race icon:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('race-icons')
    .getPublicUrl(path);

  return `${urlData.publicUrl}?t=${Date.now()}`;
}

// Cycling race resets — only count sessions logged from this date onward.
export const CYCLING_RACE_START_DATE = '2026-05-01';

export async function getGroupCyclingDistance(
  memberIds: string[],
  year: number
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (memberIds.length === 0) return result;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('user_id, distance_km')
    .in('user_id', memberIds)
    .eq('sport_type', 'cycling')
    .gte('date', CYCLING_RACE_START_DATE)
    .lte('date', `${year}-12-31`);

  if (error) {
    console.error('Error fetching cycling distance:', error);
    return result;
  }

  for (const row of data ?? []) {
    if (row.distance_km == null) continue;
    result.set(row.user_id, (result.get(row.user_id) ?? 0) + Number(row.distance_km));
  }
  return result;
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
  photoUrls?: string[];
}): Promise<LogSessionOutcome> {
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
      is_bonus: params.plannedSessionId === null,
      photo_urls: params.photoUrls ?? [],
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Error logging session:', sessionError);
    const code = sessionError?.code ? ` [${sessionError.code}]` : '';
    const detail = sessionError?.message ?? 'Insert returned no row';
    return { error: `sessions.insert${code}: ${detail}` };
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
        photo_urls: params.photoUrls ?? [],
      },
    });
  }

  const newBadges = await checkAndAwardBadges(params.userId);

  // --- Notifications ---
  const prefs = params.currentProfile.notification_preferences;
  const sportLabel = SPORT_CONFIG[params.sportType]?.label ?? params.sportType;

  notify(
    'session_logged',
    prefs,
    `${sportLabel} loggat!`,
    `${params.durationMinutes} min — du fick ${ep} EP`,
    'session-logged',
    { url: '/', userId: params.userId }
  );

  const newStreak2 = params.currentProfile.current_streak + 1;
  if ([3, 5, 7, 10, 14, 21, 30, 50, 100].includes(newStreak2)) {
    notify(
      'streak_milestone',
      prefs,
      `${newStreak2} dagar i rad!`,
      newStreak2 >= 7
        ? `Otroligt! Din streak-bonus ar nu 1.3x`
        : `Bra jobbat! Hog streak = mer EP`,
      'streak-milestone',
      { url: '/profile', userId: params.userId }
    );
  }

  for (const badgeName of newBadges) {
    notify(
      'badge_unlocked',
      prefs,
      'Ny badge!',
      badgeName,
      `badge-${badgeName}`,
      { url: '/profile', userId: params.userId }
    );
  }

  // Check for personal records
  const previousSessions = await getUserSessions(params.userId);
  const personalRecords = detectPersonalRecords(session, previousSessions);

  return { session, newBadges, personalRecords };
}
