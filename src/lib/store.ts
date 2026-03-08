import { createClient } from '@/lib/supabase';
import { calculateEP } from './ep-calculator';
import { checkAndAwardBadges } from './badge-checker';
import { calculateBossDamage } from './boss-engine';
import type {
  Profile,
  Session,
  Badge,
  UserBadgeWithBadge,
  StravaConnection,
  ActivityFeedItemWithUser,
  GroupDetails,
  GroupMemberWithProfile,
  SportType,
  EffortRating,
  BossDefinition,
  BossEncounter,
  BossEncounterWithBoss,
  BossAttack,
  BossTrophy,
} from '@/types/database';

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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, email')
    .neq('display_name', '')
    .order('display_name');

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

// ---------------------------------------------------------------------------
// Group members
// ---------------------------------------------------------------------------

export async function getGroupMembers(
  userId: string
): Promise<Profile[]> {
  const supabase = createClient();

  // Find the user's group
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    // User has no group — return empty array
    return [];
  }

  // Get all profiles in that group
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, role, profiles(*)')
    .eq('group_id', membership.group_id);

  if (membersError || !members) {
    return [];
  }

  // Extract profile from each member row
  return members
    .map((m) => m.profiles as unknown as Profile)
    .filter(Boolean);
}

/**
 * Get the group ID for a given user. Returns null if user has no group.
 */
export async function getUserGroupId(
  userId: string
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.group_id;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function getUserSessions(
  userId: string
): Promise<Session[]> {
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

  // 1. Insert the session
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

  // 2. Update profile EP and streak
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

  // 3. Insert activity feed item (only if user has a group)
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

  // 4. Check and award badges
  const newBadges = await checkAndAwardBadges(params.userId);

  return { session, newBadges };
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export async function getActivityFeed(
  groupId: string
): Promise<ActivityFeedItemWithUser[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, profiles(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) {
    console.error('Error fetching activity feed:', error);
    return [];
  }

  // Map the Supabase join result to match ActivityFeedItemWithUser shape.
  // Supabase returns { ...feedItem, profiles: { ...profileData } }
  // We need to map profiles -> user for backward compat.
  return data.map((item) => {
    const { profiles, ...feedFields } = item as Record<string, unknown>;
    return {
      ...feedFields,
      user: profiles as Profile,
    } as ActivityFeedItemWithUser;
  });
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getUserStats(userId: string) {
  const sessions = await getUserSessions(userId);

  const cyclingSessions = sessions.filter(
    (s) => s.sport_type === 'cycling'
  );
  const runningSessions = sessions.filter(
    (s) => s.sport_type === 'running'
  );
  const swimmingSessions = sessions.filter(
    (s) => s.sport_type === 'swimming'
  );

  return {
    totalSessions: sessions.length,
    totalEP: sessions.reduce((sum, s) => sum + s.ep_earned, 0),
    totalDurationMinutes: sessions.reduce(
      (sum, s) => sum + s.duration_minutes,
      0
    ),
    cycling: {
      sessions: cyclingSessions.length,
      totalMinutes: cyclingSessions.reduce(
        (sum, s) => sum + s.duration_minutes,
        0
      ),
      totalKm: cyclingSessions.reduce(
        (sum, s) => sum + (s.distance_km || 0),
        0
      ),
    },
    running: {
      sessions: runningSessions.length,
      totalMinutes: runningSessions.reduce(
        (sum, s) => sum + s.duration_minutes,
        0
      ),
      totalKm: runningSessions.reduce(
        (sum, s) => sum + (s.distance_km || 0),
        0
      ),
    },
    swimming: {
      sessions: swimmingSessions.length,
      totalMinutes: swimmingSessions.reduce(
        (sum, s) => sum + s.duration_minutes,
        0
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Week completion stats
// ---------------------------------------------------------------------------

export async function getWeekCompletionStats(
  weekNumber: number,
  userId: string
) {
  // Import training plan lazily to avoid circular deps
  const { TRAINING_PLAN } = await import('./training-plan');

  const weekPlan = TRAINING_PLAN.filter(
    (p) => p.week_number === weekNumber && p.sport_type !== 'rest'
  );

  const sessions = await getUserSessions(userId);
  const weekSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date);
    const startMonday = new Date(2026, 1, 23);
    const diffDays = Math.floor(
      (sessionDate.getTime() - startMonday.getTime()) / (24 * 60 * 60 * 1000)
    );
    const sessionWeek = Math.floor(diffDays / 7) + 1;
    return sessionWeek === weekNumber;
  });

  return {
    planned: weekPlan.length,
    completed: weekSessions.length,
    percentage:
      weekPlan.length > 0
        ? Math.round((weekSessions.length / weekPlan.length) * 100)
        : 0,
  };
}

// ---------------------------------------------------------------------------
// Group invitation system
// ---------------------------------------------------------------------------

/**
 * Generate a random invite code (8 characters, uppercase alphanumeric,
 * excluding ambiguous characters like 0/O, 1/I/L).
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get group details including invite_code and all members with profiles.
 */
export async function getGroupDetails(
  groupId: string
): Promise<GroupDetails | null> {
  const supabase = createClient();

  // Fetch the group row
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, invite_code, created_by')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    console.error('Error fetching group details:', groupError);
    return null;
  }

  // Fetch all members with their profile data
  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(*)')
    .eq('group_id', groupId);

  if (membersError || !membersData) {
    console.error('Error fetching group members:', membersError);
    return null;
  }

  const members: GroupMemberWithProfile[] = membersData.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: m.profiles as unknown as Profile,
  }));

  return {
    id: group.id,
    name: group.name,
    invite_code: group.invite_code,
    created_by: group.created_by,
    members,
  };
}

/**
 * Join a group by invite code (for logged-in users).
 * Looks up the group by invite_code, checks the user isn't already a member,
 * then inserts a new group_member row.
 */
export async function joinGroupByCode(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Look up the group by invite code
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (groupError || !group) {
    return { success: false, error: 'Ogiltig inbjudningskod. Kontrollera koden och försök igen.' };
  }

  // Check if user is already a member of this group
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Du är redan medlem i denna grupp.' };
  }

  // Check if user is already in another group — leave it first
  const { data: currentMembership } = await supabase
    .from('group_members')
    .select('id, group_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (currentMembership) {
    // Remove from current group before joining new one
    await supabase
      .from('group_members')
      .delete()
      .eq('id', currentMembership.id);
  }

  // Join the group as a member
  const { error: insertError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    });

  if (insertError) {
    console.error('Error joining group:', insertError);
    return { success: false, error: 'Kunde inte gå med i gruppen. Försök igen.' };
  }

  return { success: true };
}

/**
 * Leave the current group. Owners cannot leave — they must transfer ownership first.
 */
export async function leaveGroup(
  userId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Check the user's role in the group
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('id, role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership) {
    return { success: false, error: 'Du är inte medlem i denna grupp.' };
  }

  if (membership.role === 'owner') {
    return { success: false, error: 'Ägaren kan inte lämna gruppen. Överför ägarskapet först.' };
  }

  // Delete the membership
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('id', membership.id);

  if (deleteError) {
    console.error('Error leaving group:', deleteError);
    return { success: false, error: 'Kunde inte lämna gruppen. Försök igen.' };
  }

  return { success: true };
}

/**
 * Regenerate the invite code for a group (owner only).
 * Generates a new 8-char code and updates the groups table.
 */
export async function regenerateInviteCode(
  groupId: string
): Promise<string | null> {
  const supabase = createClient();

  const newCode = generateInviteCode();

  const { error } = await supabase
    .from('groups')
    .update({ invite_code: newCode })
    .eq('id', groupId);

  if (error) {
    console.error('Error regenerating invite code:', error);
    return null;
  }

  return newCode;
}

/**
 * Create a new group and add the user as owner.
 */
export async function createGroup(
  userId: string,
  groupName: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  const supabase = createClient();

  const inviteCode = generateInviteCode();

  // Check if user is already in a group
  const { data: currentMembership } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (currentMembership) {
    return { success: false, error: 'Du är redan medlem i en grupp. Lämna din nuvarande grupp först.' };
  }

  const { data: newGroup, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: groupName,
      invite_code: inviteCode,
      created_by: userId,
    })
    .select('id')
    .single();

  if (groupError || !newGroup) {
    console.error('Error creating group:', groupError);
    return { success: false, error: 'Kunde inte skapa gruppen. Försök igen.' };
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: newGroup.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    console.error('Error adding owner to group:', memberError);
    return { success: false, error: 'Gruppen skapades men kunde inte lägga till dig som ägare.' };
  }

  return { success: true, groupId: newGroup.id };
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/**
 * Fetch all badge definitions.
 */
export async function getAllBadges(): Promise<Badge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('category')
    .order('name');

  if (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch all badges earned by a user, including badge details.
 */
export async function getUserBadges(
  userId: string
): Promise<UserBadgeWithBadge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching user badges:', error);
    return [];
  }

  // Supabase returns { ...userBadge, badges: { ...badgeData } }
  // We need to map badges -> badge for the UserBadgeWithBadge type.
  return data.map((item) => {
    const { badges: badgeData, ...userBadgeFields } = item as Record<string, unknown>;
    return {
      ...userBadgeFields,
      badge: badgeData as Badge,
    } as UserBadgeWithBadge;
  });
}

// ---------------------------------------------------------------------------
// Strava connection
// ---------------------------------------------------------------------------

/**
 * Get the Strava connection for a user.
 * Returns null if no connection exists.
 */
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

/**
 * Disconnect Strava by deleting the connection row.
 * Returns true on success, false on failure.
 */
export async function disconnectStrava(
  userId: string
): Promise<boolean> {
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

// ---------------------------------------------------------------------------
// Boss Battle System
// ---------------------------------------------------------------------------

/**
 * Fetch the active boss encounter for a group, joined with boss definition.
 */
export async function getActiveBossEncounter(
  groupId: string
): Promise<BossEncounterWithBoss | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_encounters')
    .select('*, boss_definitions(*)')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching active boss encounter:', error);
    return null;
  }

  const { boss_definitions: boss, ...encounterFields } = data as Record<string, unknown>;
  return {
    ...encounterFields,
    boss: boss as BossDefinition,
  } as BossEncounterWithBoss;
}

/**
 * Get all attacks for a boss encounter.
 */
export async function getBossAttacks(
  encounterId: string
): Promise<BossAttack[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_attacks')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching boss attacks:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Count unique attackers for a boss encounter (used for combo bonus).
 */
export async function getUniqueAttackerCount(
  encounterId: string
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_attacks')
    .select('user_id')
    .eq('encounter_id', encounterId);

  if (error || !data) {
    console.error('Error counting unique attackers:', error);
    return 0;
  }

  const uniqueUserIds = new Set(data.map((row) => row.user_id));
  return uniqueUserIds.size;
}

/**
 * Main boss attack function — called after logging a session.
 * Calculates damage, records the attack, updates HP, and handles defeat.
 */
export async function attackBoss(params: {
  userId: string;
  groupId: string;
  sessionId: string;
  sportType: SportType;
  epEarned: number;
}): Promise<{
  damage: number;
  isCritical: boolean;
  bossEmoji: string;
  bossName: string;
  isKillingBlow: boolean;
  remainingHP: number;
  maxHP: number;
} | null> {
  const supabase = createClient();

  // a. Get active encounter
  const encounter = await getActiveBossEncounter(params.groupId);
  if (!encounter) return null;

  // b. Get unique attacker count for combo bonus
  const uniqueAttackers = await getUniqueAttackerCount(encounter.id);

  // c. Calculate damage
  const damageResult = calculateBossDamage({
    ep: params.epEarned,
    sportType: params.sportType,
    bossWeakness: encounter.boss.weakness ?? 'other',
    bossResistance: encounter.boss.resistance ?? 'other',
    uniqueAttackersThisWeek: uniqueAttackers,
  });

  // d. Insert boss_attack row
  const { error: attackError } = await supabase
    .from('boss_attacks')
    .insert({
      encounter_id: encounter.id,
      user_id: params.userId,
      session_id: params.sessionId,
      damage: damageResult.damage,
      is_critical: damageResult.isCritical,
      sport_type: params.sportType,
    });

  if (attackError) {
    console.error('Error inserting boss attack:', attackError);
    return null;
  }

  // e. Update boss encounter HP (subtract damage, min 0)
  const newHP = Math.max(0, encounter.current_hp - damageResult.damage);

  const { error: updateError } = await supabase
    .from('boss_encounters')
    .update({ current_hp: newHP })
    .eq('id', encounter.id);

  if (updateError) {
    console.error('Error updating boss HP:', updateError);
  }

  // f. Post activity feed event
  const feedEventType = damageResult.isCritical ? 'boss_critical_hit' : 'boss_attacked';
  await supabase.from('activity_feed').insert({
    group_id: params.groupId,
    user_id: params.userId,
    event_type: feedEventType,
    event_data: {
      boss_name: encounter.boss.name,
      boss_emoji: encounter.boss.emoji,
      damage: damageResult.damage,
      is_critical: damageResult.isCritical,
      sport_type: params.sportType,
      remaining_hp: newHP,
      max_hp: encounter.max_hp,
    },
  });

  // g. If HP reaches 0, handle defeat
  const isKillingBlow = newHP === 0;
  if (isKillingBlow) {
    await handleBossDefeated({
      encounterId: encounter.id,
      groupId: params.groupId,
      killingBlowUserId: params.userId,
      bossId: encounter.boss.id,
      bossLevel: encounter.boss.level,
    });
  }

  // h. Return damage result
  return {
    damage: damageResult.damage,
    isCritical: damageResult.isCritical,
    bossEmoji: encounter.boss.emoji,
    bossName: encounter.boss.name,
    isKillingBlow,
    remainingHP: newHP,
    maxHP: encounter.max_hp,
  };
}

/**
 * Internal: Handle a boss being defeated.
 * Updates encounter status, awards bonus EP and trophies to all attackers.
 */
async function handleBossDefeated(params: {
  encounterId: string;
  groupId: string;
  killingBlowUserId: string;
  bossId: number;
  bossLevel: number;
}) {
  const supabase = createClient();

  // a. Update encounter status
  const { error: encounterError } = await supabase
    .from('boss_encounters')
    .update({
      status: 'defeated',
      defeated_at: new Date().toISOString(),
      defeated_by: params.killingBlowUserId,
    })
    .eq('id', params.encounterId);

  if (encounterError) {
    console.error('Error updating defeated encounter:', encounterError);
  }

  // b. Get all unique attackers
  const { data: attackRows, error: attacksError } = await supabase
    .from('boss_attacks')
    .select('user_id')
    .eq('encounter_id', params.encounterId);

  if (attacksError || !attackRows) {
    console.error('Error fetching attackers for trophies:', attacksError);
    return;
  }

  const uniqueAttackerIds = [...new Set(attackRows.map((r) => r.user_id))];

  // c. Calculate bonus EP: bossLevel * 10 (killing blow gets 2x)
  const baseBonusEP = params.bossLevel * 10;

  // d. For each attacker: insert boss_trophy and update profile.total_ep
  for (const attackerId of uniqueAttackerIds) {
    const isKiller = attackerId === params.killingBlowUserId;
    const bonusEP = isKiller ? baseBonusEP * 2 : baseBonusEP;

    // Insert trophy
    await supabase.from('boss_trophies').insert({
      user_id: attackerId,
      encounter_id: params.encounterId,
      boss_id: params.bossId,
      bonus_ep: bonusEP,
      is_killing_blow: isKiller,
    });

    // Update profile EP
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_ep')
      .eq('id', attackerId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ total_ep: profile.total_ep + bonusEP })
        .eq('id', attackerId);
    }
  }

  // e. Post activity feed event: boss_defeated
  await supabase.from('activity_feed').insert({
    group_id: params.groupId,
    user_id: params.killingBlowUserId,
    event_type: 'boss_defeated',
    event_data: {
      boss_id: params.bossId,
      boss_level: params.bossLevel,
      bonus_ep: baseBonusEP,
      killing_blow_user_id: params.killingBlowUserId,
      total_attackers: uniqueAttackerIds.length,
    },
  });
}

/**
 * Handle a boss encounter that failed (week ended without defeat).
 * Marks encounter as failed and posts to activity feed.
 */
export async function handleBossFailed(
  encounterId: string,
  groupId: string
): Promise<void> {
  const supabase = createClient();

  // a. Update encounter status to failed
  const { error: updateError } = await supabase
    .from('boss_encounters')
    .update({ status: 'failed' })
    .eq('id', encounterId);

  if (updateError) {
    console.error('Error marking boss as failed:', updateError);
  }

  // b. Post activity feed event: boss_failed
  // Use the group creator or a system user for the feed entry
  const { data: encounter } = await supabase
    .from('boss_encounters')
    .select('boss_id, boss_definitions(*)')
    .eq('id', encounterId)
    .single();

  const bossData = (encounter as unknown as Record<string, unknown>)?.boss_definitions as Record<string, unknown> | null;

  await supabase.from('activity_feed').insert({
    group_id: groupId,
    user_id: '00000000-0000-0000-0000-000000000000', // system event
    event_type: 'boss_failed',
    event_data: {
      boss_id: encounter?.boss_id ?? null,
      boss_name: bossData?.name ?? 'Unknown',
      boss_emoji: bossData?.emoji ?? '',
      encounter_id: encounterId,
    },
  });
}

/**
 * Get all boss trophies for a user, joined with boss definitions.
 */
export async function getUserBossTrophies(
  userId: string
): Promise<(BossTrophy & { boss: BossDefinition })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_trophies')
    .select('*, boss_definitions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching user boss trophies:', error);
    return [];
  }

  return data.map((item) => {
    const { boss_definitions: boss, ...trophyFields } = item as Record<string, unknown>;
    return {
      ...trophyFields,
      boss: boss as BossDefinition,
    } as BossTrophy & { boss: BossDefinition };
  });
}

/**
 * Get past boss encounters (defeated + failed) for a group.
 */
export async function getBossHistory(
  groupId: string
): Promise<BossEncounterWithBoss[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_encounters')
    .select('*, boss_definitions(*)')
    .eq('group_id', groupId)
    .in('status', ['defeated', 'failed'])
    .order('week_start', { ascending: false });

  if (error || !data) {
    console.error('Error fetching boss history:', error);
    return [];
  }

  return data.map((item) => {
    const { boss_definitions: boss, ...encounterFields } = item as Record<string, unknown>;
    return {
      ...encounterFields,
      boss: boss as BossDefinition,
    } as BossEncounterWithBoss;
  });
}
