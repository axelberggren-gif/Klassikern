import { createClient } from '@/lib/supabase';
import type { Profile, SportType, PowerRanking } from '@/types/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get Monday 00:00:00 of the week containing the given date. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get Sunday 23:59:59 of the week containing the given date. */
function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/** Format a Date as YYYY-MM-DD for Supabase date comparisons. */
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get ISO week number for a given date. */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Fetch user IDs belonging to a group. */
async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (error || !data) {
    console.error('Error fetching group member IDs:', error);
    return [];
  }
  return data.map((m: { user_id: string }) => m.user_id);
}

// ---------------------------------------------------------------------------
// Weekly EP by User
// ---------------------------------------------------------------------------

export interface WeeklyUserEP {
  userId: string;
  displayName: string;
  totalEP: number;
}

/**
 * Sum EP earned per user in a group within a date range.
 * Joins with profiles to get display names.
 */
export async function getWeeklyEPByUser(
  groupId: string,
  weekStart: string,
  weekEnd: string
): Promise<WeeklyUserEP[]> {
  const supabase = createClient();
  const memberIds = await getGroupMemberIds(groupId);

  if (memberIds.length === 0) return [];

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('user_id, ep_earned')
    .in('user_id', memberIds)
    .gte('date', weekStart)
    .lte('date', weekEnd);

  if (error || !sessions) {
    console.error('Error fetching weekly EP:', error);
    return [];
  }

  // Aggregate EP per user
  const epMap = new Map<string, number>();
  for (const s of sessions) {
    epMap.set(s.user_id, (epMap.get(s.user_id) || 0) + s.ep_earned);
  }

  // Fetch profiles for display names
  const userIds = [...epMap.keys()];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  if (profileError || !profiles) {
    console.error('Error fetching profiles for leaderboard:', profileError);
    return [];
  }

  const profileMap = new Map<string, string>(profiles.map((p: { id: string; display_name: string }) => [p.id, p.display_name]));

  return userIds
    .map((userId) => ({
      userId,
      displayName: profileMap.get(userId) || 'Okänd',
      totalEP: epMap.get(userId) || 0,
    }))
    .sort((a, b) => b.totalEP - a.totalEP);
}

// ---------------------------------------------------------------------------
// Weekly Winners
// ---------------------------------------------------------------------------

export interface WeeklyWinnerResult {
  weekNumber: number;
  weekStart: string;
  userId: string;
  displayName: string;
  value: number;
}

/**
 * Returns the EP winner for each of the last N weeks (Mon–Sun).
 * For each week, finds the user who earned the most EP.
 */
export async function getWeeklyWinners(
  groupId: string,
  numWeeks: number
): Promise<WeeklyWinnerResult[]> {
  const now = new Date();
  const currentMonday = getMonday(now);
  const winners: WeeklyWinnerResult[] = [];

  for (let i = 1; i <= numWeeks; i++) {
    const weekMonday = new Date(currentMonday);
    weekMonday.setDate(currentMonday.getDate() - i * 7);
    const weekSunday = new Date(weekMonday);
    weekSunday.setDate(weekMonday.getDate() + 6);

    const weekStart = toDateString(weekMonday);
    const weekEnd = toDateString(weekSunday);

    const results = await getWeeklyEPByUser(groupId, weekStart, weekEnd);

    if (results.length > 0) {
      const top = results[0];
      winners.push({
        weekNumber: getISOWeekNumber(weekMonday),
        weekStart,
        userId: top.userId,
        displayName: top.displayName,
        value: top.totalEP,
      });
    }
  }

  return winners;
}

// ---------------------------------------------------------------------------
// Sport-Specific Leaderboard
// ---------------------------------------------------------------------------

export interface SportLeaderboardEntry {
  userId: string;
  displayName: string;
  totalEP: number;
  totalMinutes: number;
  sessionCount: number;
}

/**
 * Total EP, duration, and session count per user for a specific sport within a group.
 */
export async function getSportLeaderboard(
  groupId: string,
  sportType: SportType
): Promise<SportLeaderboardEntry[]> {
  const supabase = createClient();
  const memberIds = await getGroupMemberIds(groupId);

  if (memberIds.length === 0) return [];

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('user_id, ep_earned, duration_minutes')
    .in('user_id', memberIds)
    .eq('sport_type', sportType);

  if (error || !sessions) {
    console.error('Error fetching sport leaderboard:', error);
    return [];
  }

  // Aggregate per user
  const statsMap = new Map<string, { totalEP: number; totalMinutes: number; sessionCount: number }>();
  for (const s of sessions) {
    const existing = statsMap.get(s.user_id) || { totalEP: 0, totalMinutes: 0, sessionCount: 0 };
    existing.totalEP += s.ep_earned;
    existing.totalMinutes += s.duration_minutes;
    existing.sessionCount += 1;
    statsMap.set(s.user_id, existing);
  }

  // Fetch profiles
  const userIds = [...statsMap.keys()];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  if (profileError || !profiles) {
    console.error('Error fetching profiles for sport leaderboard:', profileError);
    return [];
  }

  const profileMap = new Map<string, string>(profiles.map((p: { id: string; display_name: string }) => [p.id, p.display_name]));

  return userIds
    .map((userId) => {
      const stats = statsMap.get(userId)!;
      return {
        userId,
        displayName: profileMap.get(userId) || 'Okänd',
        totalEP: stats.totalEP,
        totalMinutes: stats.totalMinutes,
        sessionCount: stats.sessionCount,
      };
    })
    .sort((a, b) => b.totalEP - a.totalEP);
}

// ---------------------------------------------------------------------------
// Power Rankings
// ---------------------------------------------------------------------------

/**
 * Compute composite power rankings for group members.
 *
 * Pure function — no DB calls. Takes pre-fetched data:
 * - members: profile rows for the group
 * - damageMap: userId → total boss damage this week
 * - weeklySessionCounts: userId → number of sessions this week
 *
 * Score = epScore(35%) + streakScore(20%) + damageScore(25%) + consistencyScore(20%)
 */
export function getPowerRankings(
  members: Profile[],
  damageMap: Map<string, number>,
  weeklySessionCounts: Map<string, number>
): PowerRanking[] {
  if (members.length === 0) return [];

  // Normalize helper: value / max * 100, safe for max=0
  const normalize = (value: number, max: number): number =>
    max > 0 ? (value / max) * 100 : 0;

  const maxEP = Math.max(...members.map((m) => m.total_ep), 1);
  const maxStreak = Math.max(...members.map((m) => m.current_streak), 1);
  const maxDamage = Math.max(...[...damageMap.values()], 1);

  const rankings: PowerRanking[] = members.map((member) => {
    const epScore = normalize(member.total_ep, maxEP);
    const streakScore = normalize(member.current_streak, maxStreak);
    const damageScore = normalize(damageMap.get(member.id) || 0, maxDamage);
    const sessionsThisWeek = weeklySessionCounts.get(member.id) || 0;
    const consistencyScore = Math.min((sessionsThisWeek / 5) * 100, 100);

    const score =
      epScore * 0.35 +
      streakScore * 0.2 +
      damageScore * 0.25 +
      consistencyScore * 0.2;

    return {
      userId: member.id,
      displayName: member.display_name,
      score: Math.round(score * 10) / 10,
      epScore: Math.round(epScore * 10) / 10,
      streakScore: Math.round(streakScore * 10) / 10,
      damageScore: Math.round(damageScore * 10) / 10,
      consistencyScore: Math.round(consistencyScore * 10) / 10,
      previousRank: null,
      currentRank: 0, // will be set below
    };
  });

  // Sort by score descending and assign ranks
  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, i) => {
    r.currentRank = i + 1;
  });

  return rankings;
}

// ---------------------------------------------------------------------------
// Head-to-Head
// ---------------------------------------------------------------------------

export interface HeadToHeadUser {
  profile: Profile;
  weekEP: number;
  totalEP: number;
  weekSessions: number;
  streak: number;
  bossDamage: number;
}

export interface HeadToHeadData {
  user1: HeadToHeadUser;
  user2: HeadToHeadUser;
}

/**
 * Compare two users side-by-side: this week's EP, total EP, sessions, streak, boss damage.
 */
export async function getHeadToHeadData(
  userId1: string,
  userId2: string
): Promise<HeadToHeadData | null> {
  const supabase = createClient();

  // Current week boundaries
  const now = new Date();
  const weekStart = toDateString(getMonday(now));
  const weekEnd = toDateString(getSunday(now));

  // Fetch profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', [userId1, userId2]);

  if (profileError || !profiles || profiles.length < 2) {
    console.error('Error fetching profiles for head-to-head:', profileError);
    return null;
  }

  const profile1 = profiles.find((p: Profile) => p.id === userId1)!;
  const profile2 = profiles.find((p: Profile) => p.id === userId2)!;

  // Fetch sessions for both users this week
  const { data: weekSessions, error: weekError } = await supabase
    .from('sessions')
    .select('user_id, ep_earned')
    .in('user_id', [userId1, userId2])
    .gte('date', weekStart)
    .lte('date', weekEnd);

  if (weekError) {
    console.error('Error fetching week sessions for head-to-head:', weekError);
    return null;
  }

  type WeekAccum = Record<string, { ep: number; count: number }>;
  const weekData = (weekSessions || []).reduce(
    (acc: WeekAccum, s: { user_id: string; ep_earned: number }) => {
      if (!acc[s.user_id]) acc[s.user_id] = { ep: 0, count: 0 };
      acc[s.user_id].ep += s.ep_earned;
      acc[s.user_id].count += 1;
      return acc;
    },
    {} as WeekAccum
  );

  // Fetch boss damage this week (from boss_attacks)
  const { data: bossAttacks, error: bossError } = await supabase
    .from('boss_attacks')
    .select('user_id, damage')
    .in('user_id', [userId1, userId2])
    .gte('created_at', new Date(getMonday(now)).toISOString())
    .lte('created_at', new Date(getSunday(now)).toISOString());

  if (bossError) {
    console.error('Error fetching boss attacks for head-to-head:', bossError);
  }

  const damageMap: Record<string, number> = {};
  for (const a of bossAttacks || []) {
    damageMap[a.user_id] = (damageMap[a.user_id] || 0) + a.damage;
  }

  const buildUser = (profile: Profile, uid: string): HeadToHeadUser => ({
    profile,
    weekEP: weekData[uid]?.ep || 0,
    totalEP: profile.total_ep,
    weekSessions: weekData[uid]?.count || 0,
    streak: profile.current_streak,
    bossDamage: damageMap[uid] || 0,
  });

  return {
    user1: buildUser(profile1, userId1),
    user2: buildUser(profile2, userId2),
  };
}
