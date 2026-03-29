import { createClient } from '@/lib/supabase';
import { calculateBossDamage, generateDefeatText } from '../boss-engine';
import type { CritContext } from '../boss-engine';
import { getWeekRange, getCurrentWeekNumber } from '../date-utils';
import { notify } from '../notifications';
import type {
  Profile,
  SportType,
  BossDefinition,
  BossEncounterWithBoss,
  BossAttack,
  BossAttackWithUser,
  BossTrophy,
  BossTrophyWithBoss,
  Session,
  NotificationPreferences,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Boss Battle System
// ---------------------------------------------------------------------------

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

export async function getBossAttacks(encounterId: string): Promise<BossAttack[]> {
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

export async function getUniqueAttackerCount(encounterId: string): Promise<number> {
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

async function getTodayAttacksByUser(encounterId: string, userId: string): Promise<number> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('boss_attacks')
    .select('*', { count: 'exact', head: true })
    .eq('encounter_id', encounterId)
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  if (error) return 1;
  return count ?? 0;
}

export async function attackBoss(params: {
  userId: string;
  groupId: string;
  sessionId: string;
  sportType: SportType;
  epEarned: number;
  notificationPrefs?: NotificationPreferences;
}): Promise<{
  damage: number;
  isCritical: boolean;
  bossEmoji: string;
  bossName: string;
  bossLevel: number;
  isKillingBlow: boolean;
  remainingHP: number;
  maxHP: number;
} | null> {
  const supabase = createClient();

  const encounter = await getActiveBossEncounter(params.groupId);
  if (!encounter) return null;

  const uniqueAttackers = await getUniqueAttackerCount(encounter.id);
  const todayUserAttacks = await getTodayAttacksByUser(encounter.id, params.userId);

  const damageResult = calculateBossDamage({
    epEarned: params.epEarned,
    sportType: params.sportType,
    boss: encounter.boss,
    encounter,
    todayAttackerCount: uniqueAttackers,
    critContext: {
      sessionTime: new Date(),
      sessionDurationMinutes: 45, // default for per-session attacks
      userStreak: 0,
      todayAttackerCount: uniqueAttackers,
      isFirstAttackToday: todayUserAttacks === 0,
    },
  });

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

  const newHP = Math.max(0, encounter.current_hp - damageResult.damage);

  const { error: updateError } = await supabase
    .from('boss_encounters')
    .update({ current_hp: newHP })
    .eq('id', encounter.id);

  if (updateError) {
    console.error('Error updating boss HP:', updateError);
  }

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

  // --- Notifications ---
  const prefs = params.notificationPrefs;

  if (damageResult.isCritical && encounter.boss.weakness === params.sportType) {
    notify(
      'boss_weakness_hit',
      prefs,
      'Supereffektivt!',
      `Din traning traffade ${encounter.boss.emoji} ${encounter.boss.name}s svaghet`,
      'boss-weakness',
      { url: '/group', userId: params.userId }
    );
  }

  if (newHP > 0 && newHP <= encounter.max_hp * 0.1) {
    notify(
      'boss_low_hp',
      prefs,
      `${encounter.boss.emoji} ${encounter.boss.name} ar nastan besegrad!`,
      `Bara ${newHP} HP kvar — en attack till!`,
      'boss-low-hp',
      { url: '/group', userId: params.userId }
    );
  }

  if (isKillingBlow) {
    notify(
      'boss_killing_blow',
      prefs,
      'Dodsstoten!',
      `Du besegrade ${encounter.boss.emoji} ${encounter.boss.name}!`,
      'boss-killing-blow',
      { url: '/group', userId: params.userId }
    );
  }

  return {
    damage: damageResult.damage,
    isCritical: damageResult.isCritical,
    bossEmoji: encounter.boss.emoji,
    bossName: encounter.boss.name,
    bossLevel: encounter.boss.level,
    isKillingBlow,
    remainingHP: newHP,
    maxHP: encounter.max_hp,
  };
}

async function handleBossDefeated(params: {
  encounterId: string;
  groupId: string;
  killingBlowUserId: string;
  bossId: number;
  bossLevel: number;
  defeatText?: string;
  critSecret?: string | null;
}) {
  const supabase = createClient();

  const { error: encounterError } = await supabase
    .from('boss_encounters')
    .update({
      status: 'defeated',
      defeated_at: new Date().toISOString(),
      defeated_by: params.killingBlowUserId,
      defeat_text: params.defeatText ?? null,
      crit_secret: params.critSecret ?? null,
    })
    .eq('id', params.encounterId);

  if (encounterError) {
    console.error('Error updating defeated encounter:', encounterError);
  }

  const { data: attackRows, error: attacksError } = await supabase
    .from('boss_attacks')
    .select('user_id')
    .eq('encounter_id', params.encounterId);

  if (attacksError || !attackRows) {
    console.error('Error fetching attackers for trophies:', attacksError);
    return;
  }

  const uniqueAttackerIds = [...new Set(attackRows.map((r) => r.user_id))];
  const baseBonusEP = params.bossLevel * 10;

  for (const attackerId of uniqueAttackerIds) {
    const isKiller = attackerId === params.killingBlowUserId;
    const bonusEP = isKiller ? baseBonusEP * 2 : baseBonusEP;

    await supabase.from('boss_trophies').insert({
      user_id: attackerId,
      encounter_id: params.encounterId,
      boss_id: params.bossId,
      bonus_ep: bonusEP,
      is_killing_blow: isKiller,
    });

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
      defeat_text: params.defeatText ?? null,
      crit_secret: params.critSecret ?? null,
    },
  });
}

export async function handleBossFailed(
  encounterId: string,
  groupId: string
): Promise<void> {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from('boss_encounters')
    .update({ status: 'failed' })
    .eq('id', encounterId);

  if (updateError) {
    console.error('Error marking boss as failed:', updateError);
  }

  const { data: encounter } = await supabase
    .from('boss_encounters')
    .select('boss_id, boss_definitions(*)')
    .eq('id', encounterId)
    .single();

  const bossData = (encounter as unknown as Record<string, unknown>)?.boss_definitions as Record<string, unknown> | null;

  await supabase.from('activity_feed').insert({
    group_id: groupId,
    user_id: '00000000-0000-0000-0000-000000000000',
    event_type: 'boss_failed',
    event_data: {
      boss_id: encounter?.boss_id ?? null,
      boss_name: bossData?.name ?? 'Unknown',
      boss_emoji: bossData?.emoji ?? '',
      encounter_id: encounterId,
    },
  });
}

// ---------------------------------------------------------------------------
// Weekly EP accumulation for boss attacks
// ---------------------------------------------------------------------------

export interface WeeklyEPInfo {
  totalEP: number;
  totalMinutes: number;
  unusedSessions: Session[];
  dominantSport: SportType;
  epBySport: Record<string, number>;
}

/**
 * Get accumulated EP from this week's sessions that haven't been used for
 * boss attacks yet.
 */
export async function getUnusedWeeklyEP(
  userId: string,
  encounterId: string
): Promise<WeeklyEPInfo> {
  const supabase = createClient();
  const wk = getCurrentWeekNumber();
  const { start, end } = getWeekRange(wk);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  // Get all sessions this week
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startStr)
    .lt('date', endStr)
    .order('date', { ascending: true });

  if (!sessions || sessions.length === 0) {
    return { totalEP: 0, totalMinutes: 0, unusedSessions: [], dominantSport: 'running', epBySport: {} };
  }

  // Get session IDs already used in boss attacks for this encounter
  const { data: usedAttacks } = await supabase
    .from('boss_attacks')
    .select('session_id')
    .eq('encounter_id', encounterId)
    .eq('user_id', userId);

  const usedSessionIds = new Set((usedAttacks ?? []).map((a) => a.session_id));

  const unusedSessions = sessions.filter((s) => !usedSessionIds.has(s.id));

  if (unusedSessions.length === 0) {
    return { totalEP: 0, totalMinutes: 0, unusedSessions: [], dominantSport: 'running', epBySport: {} };
  }

  const totalEP = unusedSessions.reduce((sum, s) => sum + s.ep_earned, 0);
  const totalMinutes = unusedSessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  // Find dominant sport (most EP) for weakness/resistance calculation
  const epBySportMap = new Map<SportType, number>();
  for (const s of unusedSessions) {
    epBySportMap.set(s.sport_type, (epBySportMap.get(s.sport_type) || 0) + s.ep_earned);
  }
  let dominantSport: SportType = 'running';
  let maxEP = 0;
  const epBySport: Record<string, number> = {};
  for (const [sport, ep] of epBySportMap) {
    epBySport[sport] = ep;
    if (ep > maxEP) {
      maxEP = ep;
      dominantSport = sport;
    }
  }

  return { totalEP, totalMinutes, unusedSessions, dominantSport, epBySport };
}

/**
 * Attack the boss using all accumulated weekly EP.
 * Inserts one boss_attack per unused session, calculates damage from total EP.
 */
export interface AttackBossWeeklyResult {
  damage: number;
  isCritical: boolean;
  bossEmoji: string;
  bossName: string;
  bossLevel: number;
  isKillingBlow: boolean;
  remainingHP: number;
  maxHP: number;
  sessionsUsed: number;
  defeatText: string | null;
  critSecret: string | null;
}

export async function attackBossWeekly(params: {
  userId: string;
  groupId: string;
  userStreak?: number;
  notificationPrefs?: NotificationPreferences;
}): Promise<AttackBossWeeklyResult | null> {
  const supabase = createClient();

  const encounter = await getActiveBossEncounter(params.groupId);
  if (!encounter) return null;

  const weeklyInfo = await getUnusedWeeklyEP(params.userId, encounter.id);
  if (weeklyInfo.totalEP === 0) return null;

  const uniqueAttackers = await getUniqueAttackerCount(encounter.id);

  // Build crit context for smart crit evaluation
  const todayUserAttacks = await getTodayAttacksByUser(encounter.id, params.userId);
  const critContext: CritContext = {
    sessionTime: new Date(),
    sessionDurationMinutes: weeklyInfo.totalMinutes,
    userStreak: params.userStreak ?? 0,
    todayAttackerCount: uniqueAttackers,
    isFirstAttackToday: todayUserAttacks === 0,
  };

  const damageResult = calculateBossDamage({
    epEarned: weeklyInfo.totalEP,
    sportType: weeklyInfo.dominantSport,
    boss: encounter.boss,
    encounter,
    todayAttackerCount: uniqueAttackers,
    critContext,
  });

  // Insert one boss_attack row per unused session (split damage proportionally)
  const totalEP = weeklyInfo.totalEP;
  for (const session of weeklyInfo.unusedSessions) {
    const proportion = session.ep_earned / totalEP;
    const sessionDamage = Math.round(damageResult.damage * proportion);
    await supabase.from('boss_attacks').insert({
      encounter_id: encounter.id,
      user_id: params.userId,
      session_id: session.id,
      damage: sessionDamage,
      is_critical: damageResult.isCritical,
      sport_type: session.sport_type,
    });
  }

  const newHP = Math.max(0, encounter.current_hp - damageResult.damage);

  await supabase
    .from('boss_encounters')
    .update({ current_hp: newHP })
    .eq('id', encounter.id);

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
      sport_type: weeklyInfo.dominantSport,
      remaining_hp: newHP,
      max_hp: encounter.max_hp,
      sessions_used: weeklyInfo.unusedSessions.length,
    },
  });

  let defeatText: string | null = null;
  let critSecret: string | null = null;

  const isKillingBlow = newHP === 0;
  if (isKillingBlow) {
    // Get killer's name and all group member names for personalized defeat text
    const { data: killerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', params.userId)
      .single();

    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('profiles(display_name)')
      .eq('group_id', params.groupId);

    const killerName = killerProfile?.display_name ?? 'Okänd';
    const memberNames = (groupMembers ?? []).map(
      (m) => ((m as Record<string, unknown>).profiles as { display_name: string })?.display_name ?? 'Okänd'
    );

    defeatText = generateDefeatText(encounter.boss, killerName, memberNames);
    critSecret = encounter.boss.crit_hint ?? null;

    await handleBossDefeated({
      encounterId: encounter.id,
      groupId: params.groupId,
      killingBlowUserId: params.userId,
      bossId: encounter.boss.id,
      bossLevel: encounter.boss.level,
      defeatText,
      critSecret,
    });
  }

  // --- Notifications ---
  const prefs = params.notificationPrefs;

  if (damageResult.isCritical && encounter.boss.weakness === weeklyInfo.dominantSport) {
    notify(
      'boss_weakness_hit',
      prefs,
      'Supereffektivt!',
      `Din traning traffade ${encounter.boss.emoji} ${encounter.boss.name}s svaghet`,
      'boss-weakness',
      { url: '/group', userId: params.userId }
    );
  }

  if (newHP > 0 && newHP <= encounter.max_hp * 0.1) {
    notify(
      'boss_low_hp',
      prefs,
      `${encounter.boss.emoji} ${encounter.boss.name} ar nastan besegrad!`,
      `Bara ${newHP} HP kvar — en attack till!`,
      'boss-low-hp',
      { url: '/group', userId: params.userId }
    );
  }

  if (isKillingBlow) {
    notify(
      'boss_killing_blow',
      prefs,
      'Dodsstoten!',
      `Du besegrade ${encounter.boss.emoji} ${encounter.boss.name}!`,
      'boss-killing-blow',
      { url: '/group', userId: params.userId }
    );
  }

  return {
    damage: damageResult.damage,
    isCritical: damageResult.isCritical,
    bossEmoji: encounter.boss.emoji,
    bossName: encounter.boss.name,
    bossLevel: encounter.boss.level,
    isKillingBlow,
    remainingHP: newHP,
    maxHP: encounter.max_hp,
    sessionsUsed: weeklyInfo.unusedSessions.length,
    defeatText,
    critSecret,
  };
}

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

export async function getAllBossDefinitions(): Promise<BossDefinition[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_definitions')
    .select('*')
    .order('level', { ascending: true });

  if (error || !data) {
    console.error('Error fetching boss definitions:', error);
    return [];
  }
  return data;
}

export async function getEncounterAttacks(
  encounterId: string
): Promise<BossAttackWithUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_attacks')
    .select('*, profiles(*)')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((item) => {
    const { profiles, ...attack } = item as Record<string, unknown>;
    return { ...attack, user: profiles } as unknown as BossAttackWithUser;
  });
}

export async function getUserTrophies(
  userId: string
): Promise<BossTrophyWithBoss[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_trophies')
    .select('*, boss_definitions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((item) => {
    const { boss_definitions, ...trophy } = item as Record<string, unknown>;
    return { ...trophy, boss: boss_definitions } as unknown as BossTrophyWithBoss;
  });
}

export async function getGroupBossHistory(
  groupId: string
): Promise<BossEncounterWithBoss[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boss_encounters')
    .select('*, boss_definitions(*)')
    .eq('group_id', groupId)
    .neq('status', 'active')
    .order('week_start', { ascending: false });
  if (error || !data) return [];
  return data.map((item) => {
    const { boss_definitions, ...encounter } = item as Record<string, unknown>;
    return { ...encounter, boss: boss_definitions } as unknown as BossEncounterWithBoss;
  });
}

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
