import { createClient } from '@/lib/supabase';
import { getWeekRange } from '@/lib/date-utils';
import type {
  WeeklyChallenge,
  ChallengeType,
  ChallengeParticipantProgress,
  Profile,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Weekly Challenges
// ---------------------------------------------------------------------------

export async function getActiveChallenge(
  groupId: string
): Promise<WeeklyChallenge | null> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_completed', false)
    .lte('started_at', now)
    .gte('ends_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active challenge:', error);
    return null;
  }
  return data;
}

export async function getChallengeHistory(
  groupId: string
): Promise<WeeklyChallenge[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_completed', true)
    .order('ends_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching challenge history:', error);
    return [];
  }
  return data ?? [];
}

export async function createChallenge(params: {
  groupId: string;
  weekNumber: number;
  title: string;
  description: string;
  challengeType: string;
  targetValue: number;
}): Promise<WeeklyChallenge | null> {
  const supabase = createClient();
  const { start, end } = getWeekRange(params.weekNumber);

  const { data, error } = await supabase
    .from('weekly_challenges')
    .insert({
      group_id: params.groupId,
      week_number: params.weekNumber,
      title: params.title,
      description: params.description,
      challenge_type: params.challengeType,
      target_value: params.targetValue,
      started_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating challenge:', error);
    return null;
  }
  return data;
}

export async function resolveChallenge(
  challengeId: string,
  groupId: string,
  winnerId: string | null,
  winnerName: string | null
): Promise<boolean> {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from('weekly_challenges')
    .update({ is_completed: true })
    .eq('id', challengeId);

  if (updateError) {
    console.error('Error resolving challenge:', updateError);
    return false;
  }

  if (winnerId && winnerName) {
    await supabase.from('activity_feed').insert({
      group_id: groupId,
      user_id: winnerId,
      event_type: 'challenge_completed',
      event_data: {
        challenge_id: challengeId,
        winner_name: winnerName,
      },
    });
  }

  return true;
}

/**
 * Calculate per-member progress for a challenge by querying sessions
 * within the challenge's time range.
 */
export async function getChallengeProgress(
  challenge: WeeklyChallenge,
  members: Profile[]
): Promise<ChallengeParticipantProgress[]> {
  const supabase = createClient();
  const challengeType = challenge.challenge_type as ChallengeType;
  const startDate = challenge.started_at.split('T')[0];
  const endDate = challenge.ends_at.split('T')[0];

  const memberIds = members.map((m) => m.id);
  if (memberIds.length === 0) return [];

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('user_id, sport_type, duration_minutes, distance_km, ep_earned')
    .in('user_id', memberIds)
    .gte('date', startDate)
    .lt('date', endDate);

  if (error || !sessions) {
    console.error('Error fetching challenge sessions:', error);
    return [];
  }

  // Parse sport filter from description for sport_sessions challenges
  // The challenge_type field stores the type, sport info is in the title/description
  const sportFilter = extractSportFilter(challenge);

  const progressMap = new Map<string, number>();
  for (const m of members) {
    progressMap.set(m.id, 0);
  }

  for (const s of sessions) {
    if (challengeType === 'sport_sessions' && sportFilter && s.sport_type !== sportFilter) {
      continue;
    }

    const current = progressMap.get(s.user_id) ?? 0;
    switch (challengeType) {
      case 'total_sessions':
      case 'sport_sessions':
        progressMap.set(s.user_id, current + 1);
        break;
      case 'total_duration':
        progressMap.set(s.user_id, current + s.duration_minutes);
        break;
      case 'total_distance':
        progressMap.set(s.user_id, current + (s.distance_km ?? 0));
        break;
      case 'total_ep':
        progressMap.set(s.user_id, current + s.ep_earned);
        break;
    }
  }

  const nameMap = new Map<string, string>();
  for (const m of members) {
    nameMap.set(m.id, m.display_name);
  }

  return Array.from(progressMap.entries())
    .map(([userId, value]) => ({
      userId,
      displayName: nameMap.get(userId) || 'Okänd',
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Try to determine sport filter from challenge metadata.
 * Convention: challenge_type contains the sport after a colon, e.g. "sport_sessions"
 * and we detect the sport from the title keywords.
 */
function extractSportFilter(challenge: WeeklyChallenge): string | null {
  const title = challenge.title.toLowerCase();
  if (title.includes('sim')) return 'swimming';
  if (title.includes('löp') || title.includes('spring')) return 'running';
  if (title.includes('cyk')) return 'cycling';
  if (title.includes('skid')) return 'skiing';
  return null;
}

export function getChallengeUnit(challengeType: string): string {
  switch (challengeType) {
    case 'total_sessions':
    case 'sport_sessions':
      return 'pass';
    case 'total_duration':
      return 'min';
    case 'total_distance':
      return 'km';
    case 'total_ep':
      return 'EP';
    default:
      return '';
  }
}
